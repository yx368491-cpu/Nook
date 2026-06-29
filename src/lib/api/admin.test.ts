/**
 * Nook M6 · Admin API client unit tests.
 *
 * Strategy: vi.mock('@/lib/supabase') at module top — verifies that
 * `adminApi.createInvite` shapes the EF request correctly AND surfaces
 * the EF response / errors in the right shapes for the UI.
 */
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    functions: { invoke: vi.fn() },
  },
}));

import { supabase } from '@/lib/supabase';
import { adminApi, mapAdminError } from './admin';

const invoke = supabase.functions.invoke as unknown as Mock;

const createdInviteFixture = {
  id: 'invite-row-uuid',
  token: 'abcdefghijklmnopqrstuvwxyz123456',
  target_kind: 'any',
  target_conversation_id: null,
  expires_at: '2026-06-30T00:00:00.000Z',
  invite_url: 'https://nook.example/invite/abcdefghijklmnopqrstuvwxyz123456',
};

beforeEach(() => {
  invoke.mockReset();
  invoke.mockResolvedValue({ data: createdInviteFixture, error: null });
});

// =========================================================================
// createInvite — request shape
// =========================================================================

describe('M6 adminApi — createInvite request shape', () => {
  it('any kind: passes target_kind="any" only', async () => {
    await adminApi.createInvite({ targetKind: 'any' });
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invoke.mock.calls[0]![0]).toBe('admin-create-invite');
    expect(invoke.mock.calls[0]![1]).toEqual({
      body: { target_kind: 'any' },
    });
  });

  it('conversation kind + cid: includes cid', async () => {
    const cid = '12345678-1234-1234-1234-123456789abc';
    await adminApi.createInvite({
      targetKind: 'conversation',
      targetConversationId: cid,
    });
    expect(invoke.mock.calls[0]![1]).toEqual({
      body: { target_kind: 'conversation', target_conversation_id: cid },
    });
  });

  it('conversation kind WITHOUT cid: omits cid field', async () => {
    await adminApi.createInvite({ targetKind: 'conversation' });
    expect(invoke.mock.calls[0]![1]).toEqual({
      body: { target_kind: 'conversation' },
    });
    expect(invoke.mock.calls[0]![1].body).not.toHaveProperty('target_conversation_id');
  });

  it('ttlHours=48: includes ttl_hours', async () => {
    await adminApi.createInvite({ targetKind: 'any', ttlHours: 48 });
    expect(invoke.mock.calls[0]![1].body.ttl_hours).toBe(48);
  });

  it('ttlHours omitted: omits ttl_hours field', async () => {
    await adminApi.createInvite({ targetKind: 'any' });
    expect(invoke.mock.calls[0]![1].body).not.toHaveProperty('ttl_hours');
  });
});

// =========================================================================
// createInvite — response shape
// =========================================================================

describe('M6 adminApi — createInvite response surfacing', () => {
  it('returns the EF payload verbatim', async () => {
    const result = await adminApi.createInvite({ targetKind: 'any' });
    expect(result).toEqual(createdInviteFixture);
  });

  it('throws AppError-shaped object when EF returns error', async () => {
    invoke.mockResolvedValueOnce({
      data: null,
      error: {
        name: 'FunctionsHttpError',
        message: 'HTTP 403',
        context: { code: 'E_AUTH_FORBIDDEN', message: 'Only the Owner may issue invites' },
      },
    });
    let captured: unknown;
    try {
      await adminApi.createInvite({ targetKind: 'any' });
    } catch (e) {
      captured = e;
    }
    expect(captured).toEqual({
      code: 'E_AUTH_FORBIDDEN',
      message: 'Only the Owner may issue invites',
    });
  });

  it('throws INTERNAL when EF returns no data and no error', async () => {
    invoke.mockResolvedValueOnce({ data: null, error: null });
    await expect(adminApi.createInvite({ targetKind: 'any' })).rejects.toEqual({
      code: 'INTERNAL',
      message: 'Invite EF returned no body',
    });
  });
});

// =========================================================================
// mapAdminError — fallbacks
// =========================================================================

describe('M6 adminApi — mapAdminError fallbacks', () => {
  it('envelope in context.error: surfaces code+message', () => {
    expect(
      mapAdminError({
        context: { error: { code: 'E_VAL_INVALID_FORMAT', message: 'bad' } },
      }),
    ).toEqual({ code: 'E_VAL_INVALID_FORMAT', message: 'bad' });
  });

  it('envelope in context.code: surfaces code', () => {
    expect(
      mapAdminError({
        context: { code: 'E_VAL_REQUIRED_FIELD', message: 'missing' },
      }),
    ).toEqual({ code: 'E_VAL_REQUIRED_FIELD', message: 'missing' });
  });

  it('message mentions "401": short-circuit to E_AUTH_UNAUTHORIZED', () => {
    expect(mapAdminError({ message: 'HTTP 401 Unauthorized' })).toEqual({
      code: 'E_AUTH_UNAUTHORIZED',
      message: 'HTTP 401 Unauthorized',
    });
  });

  it('message mentions "403": short-circuit to E_AUTH_FORBIDDEN', () => {
    expect(mapAdminError({ message: 'HTTP 403: forbidden' })).toEqual({
      code: 'E_AUTH_FORBIDDEN',
      message: 'HTTP 403: forbidden',
    });
  });

  it('bare object without envelope: INTERNAL fallback', () => {
    expect(mapAdminError({})).toEqual({ code: 'INTERNAL', message: 'Admin API error' });
  });

  it('null/undefined: INTERNAL fallback', () => {
    expect(mapAdminError(null)).toEqual({ code: 'INTERNAL', message: 'Admin API error' });
    expect(mapAdminError(undefined)).toEqual({ code: 'INTERNAL', message: 'Admin API error' });
  });
});
