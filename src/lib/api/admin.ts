/**
 * Nook M6 · Admin API client.
 *
 * Thin async wrapper over `supabase.functions.invoke('admin-create-invite', ...)`.
 * The EF (Deno deploy) does the actual JWT + role + DB work; this layer
 * just shapes the request body + parses the response.
 *
 * UI consumers import this — never invoke the EF directly.
 */

import { supabase } from '@/lib/supabase';
import type { InviteTargetKind } from '@/lib/admin/invite';

export interface CreateInviteArgs {
  targetKind: InviteTargetKind;
  /** Required iff targetKind === 'conversation'. */
  targetConversationId?: string;
  /** Optional override of the 24h default. */
  ttlHours?: number;
}

export interface CreatedInvite {
  id: string;
  token: string;
  target_kind: InviteTargetKind;
  target_conversation_id: string | null;
  expires_at: string;
  invite_url: string;
}

/**
 * Invokes the admin-create-invite EF and returns the row + invite URL.
 *
 * Error contract:
 *  - 401 → unauthorized (session expired / missing)
 *  - 403 → forbidden (caller not Owner, or conversation not owned)
 *  - 400 → badRequest (target_kind / cid / ttl validation)
 *  - 404 → not found (conversation missing — returned as 400 by EF)
 *  - 500 → internal
 *
 * The supabase.functions.invoke() client throws on non-2xx; we wrap the
 * thrown error in a typed shape so the UI can branch on `.code`.
 */
// =========================================================================
// M6-4 · Password-reset surface (admin-only)
// =========================================================================

export interface CreatePasswordResetArgs {
  targetUserId: string;
  /** Optional override of the 24h default (validated server-side 1..168). */
  ttlHours?: number;
}

export interface CreatedPasswordReset {
  id: string;
  token: string;
  target_user_id: string;
  expires_at: string;
  reset_url: string;
}

export const adminApi = {
  async createInvite(args: CreateInviteArgs): Promise<CreatedInvite> {
    const body: Record<string, unknown> = {
      target_kind: args.targetKind,
    };
    if (args.targetKind === 'conversation' && args.targetConversationId) {
      body.target_conversation_id = args.targetConversationId;
    }
    if (typeof args.ttlHours === 'number') {
      body.ttl_hours = args.ttlHours;
    }

    const { data, error } = await supabase.functions.invoke<CreatedInvite>(
      'admin-create-invite',
      { body },
    );

    if (error) {
      throw mapAdminError(error);
    }
    if (!data) {
      throw { code: 'INTERNAL', message: 'Invite EF returned no body' };
    }
    return data;
  },

  /**
   * M6-4 · Admin-issues a one-time password-reset token for a friend.
   *
   * Returns `{ id, token, target_user_id, expires_at, reset_url }` where
   * `reset_url` is a `${PUBLIC_SITE_URL}/reset-password/${token}` URL
   * the Owner can hand to the friend over WeChat/text. The friend-side
   * completion form / EF ship in M6-4.1; until then the URL routes to a
   * placeholder page so it's verifiable end-to-end visually.
   *
   * Errors: same envelope contract as createInvite (see mapAdminError).
   *  - 401 / 403 / 404 / 400 / 500 — surfacing per mapAdminError.
   */
  async createPasswordReset(args: CreatePasswordResetArgs): Promise<CreatedPasswordReset> {
    const body: Record<string, unknown> = {
      target_user_id: args.targetUserId,
    };
    if (typeof args.ttlHours === 'number') {
      body.ttl_hours = args.ttlHours;
    }

    const { data, error } = await supabase.functions.invoke<CreatedPasswordReset>(
      'admin-reset-password',
      { body },
    );

    if (error) {
      throw mapAdminError(error);
    }
    if (!data) {
      throw { code: 'INTERNAL', message: 'Reset EF returned no body' };
    }
    return data;
  },

  /**
   * M6-5 · Admin-issues a soft-delete of a friend's account (F-SEC-06).
   *
   * The EF delegates the dual UPDATE inside one transaction to the
   * RPC `fn_admin_delete_friend` so the operation is atomic. Returns
   * `{ id, target_user_id, deleted_at, conversations_left }` where
   * `conversations_left` is the count of conversation_members rows
   * that had `left_at` set on this call (0 on idempotent re-calls).
   *
   * Errors: same envelope contract as createInvite/createPasswordReset:
   *   - 400 + BAD_USER_ID / MALFORMED_BODY / E_RES_NOT_FOUND (validation)
   *   - 403 + E_AUTH_FORBIDDEN (caller not Owner OR target is Owner)
   *   - 401 + E_AUTH_UNAUTHORIZED (session expired / missing)
   *   - 500 + E_SYS_INTERNAL (RPC failure with no specific code)
   */
  async deleteFriend(args: DeleteFriendArgs): Promise<DeletedFriendSummary> {
    const { data, error } = await supabase.functions.invoke<DeletedFriendSummary>(
      'admin-delete-friend',
      { body: { target_user_id: args.targetUserId } },
    );

    if (error) {
      throw mapAdminError(error);
    }
    if (!data) {
      throw { code: 'INTERNAL', message: 'Delete-friend EF returned no body' };
    }
    return data;
  },
};

// =========================================================================
// M6-5 · Delete-friend surface (admin-only soft-delete)
// =========================================================================

export interface DeleteFriendArgs {
  targetUserId: string;
}

export interface DeletedFriendSummary {
  id: string;
  target_user_id: string;
  /** ISO 8601 UTC timestamptz string. */
  deleted_at: string;
  /** Count of conversation_members rows this call set left_at on. */
  conversations_left: number;
}

/**
 * Map supabase.functions.invoke() error shape to a Nook `AppError`-like
 * envelope. The EF returns `{ error: { code, message } }` per `_shared/response.ts`.
 * If that envelope is reachable (FunctionsHttpError exposes `.context` with body),
 * use it; otherwise fall back to numeric-status detection (more reliable than
 * text matching) and finally INTERNAL.
 *
 * supabase-js v2 surfaces the HTTP status on FunctionsHttpError.context.status;
 * older alpha builds expose it as the top-level `status`. Both are checked.
 */
interface FunctionsInvokeError {
  name?: string;
  message?: string;
  status?: number;
  context?: {
    status?: number;
    code?: string;
    message?: string;
    error?: { code?: string; message?: string };
  };
}

function firstNumber(...vals: Array<number | undefined>): number | undefined {
  for (const v of vals) if (typeof v === 'number') return v;
  return undefined;
}

export function mapAdminError(err: unknown): { code: string; message: string } {
  const e = err as FunctionsInvokeError;
  // 1. Canonical envelope wins — the EF sets .context.code OR .context.error.code.
  const envCode = e?.context?.code ?? e?.context?.error?.code;
  if (envCode) {
    return {
      code: envCode,
      message: e?.context?.message ?? e?.context?.error?.message ?? 'Admin API error',
    };
  }
  // 2. Numeric status detection — more reliable than text scans because
  //    supabase-js changes message wording across versions.
  const status = firstNumber(e?.context?.status, e?.status);
  const message = e?.message ?? 'Admin API error';
  switch (status) {
    case 401:
      return { code: 'E_AUTH_UNAUTHORIZED', message };
    case 403:
      return { code: 'E_AUTH_FORBIDDEN', message };
    case 400:
      return { code: 'E_VAL_INVALID_FORMAT', message };
    case 404:
      return { code: 'E_RES_NOT_FOUND', message };
    case 409:
      return { code: 'E_RES_CONFLICT', message };
    case 500:
      return { code: 'E_SYS_INTERNAL', message };
    default:
      break;
  }
  // 3. Last-ditch text scan (older supabase-js without status field).
  if (typeof message === 'string') {
    if (message.includes('401') || message.toLowerCase().includes('unauthorized')) {
      return { code: 'E_AUTH_UNAUTHORIZED', message };
    }
    if (message.includes('403') || message.toLowerCase().includes('forbidden')) {
      return { code: 'E_AUTH_FORBIDDEN', message };
    }
  }
  return { code: 'INTERNAL', message };
}
