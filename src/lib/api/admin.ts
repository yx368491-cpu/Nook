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
};

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
