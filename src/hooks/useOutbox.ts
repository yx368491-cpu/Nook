import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';

import {
  listOutboxForConversation,
  SENT_GRACE_MS,
  type OutboxRow,
} from '@/lib/db/outbox';
import { getDb } from '@/lib/db/schema';

/**
 * M5-1 — `useOutbox` read-only observer hook.
 *
 * Subscribes to the Dexie live-query for one conversation's outbox
 * and exposes a bucketed view of rows by state. UI consumers
 * (Composer for the yellow dot, ConversationListItem for the
 * per-row badge, future ChatPanel status strip) can pick the slice
 * they need without re-running a Dexie scan.
 *
 * Mount lifetime: Caller mounts this at the
 * ChatPanel-level (active conversation) and at the ConversationListItem-
 * level (swipe the room's pending count onto the row). Cleanup is
 * Dexie-driven — when the conversationId unmounts, useLiveQuery
 * detaches its subscription automatically.
 *
 * Self-actor gate: this hook does NOT need to filter `self` because
 * the outbox is **only the local user's own outbox**. There is no
 * `self` row to exclude — every row in the Dexie table was enqueued
 * by the local Composer / SW path, with `senderId === self`.
 *
 * Reduced-motion: the hook is purely data; it has no motion surface.
 * The yellow/green dot animation (if M5-2+ UI chooses to animate)
 * honors `prefers-reduced-motion` via CSS / Avatar.tsx as for the
 * M4-8 ambient dot.
 *
 * Boundary discipline (M5-1 = foundation only):
 *   - This hook does NOT call into the send pipeline. The send hook
 *     rewire to outbox-on-failure is M5-2.
 *   - This hook does NOT register a SW bg sync replay hook —
 *     also M5-2.
 *   - This hook does NOT render any UI — it's a data observer. UI
 *     consumers (TBD M5-2/5) own the rendering.
 */

export interface UseOutboxResult {
  /** Rows with state='pending' or state='sending' (mid-flight retry) */
  pending: OutboxRow[];
  /** Rows with state='sent' but still inside SENT_GRACE_MS */
  sent: OutboxRow[];
  /** Rows with state='failed' (terminal, MAX_ATTEMPTS reached) */
  failed: OutboxRow[];
  /** Total rows for this conversation, across all states */
  total: number;
  /** True while Dexie's `useLiveQuery` is still performing its initial query. */
  isLoading: boolean;
}

const EMPTY: UseOutboxResult = {
  pending: [],
  sent: [],
  failed: [],
  total: 0,
  isLoading: true,
};

/**
 * Read all outbox rows for `conversationId` and bucket them by state.
 *
 * @param conversationId  the active room. `null` returns an empty
 *                        snapshot (e.g. no room selected).
 */
export function useOutbox(conversationId: string | null): UseOutboxResult {
  // `useLiveQuery` returns `undefined` while the initial query is in
  // progress (specifically during Dexie's async open + initial scan).
  // After that, it re-runs whenever any of the watched tables change.
  const rows = useLiveQuery(
    async () => {
      if (!conversationId) return [] as OutboxRow[];
      return listOutboxForConversation(conversationId);
    },
    [conversationId],
    [] as OutboxRow[],
  );

  const isLoading = rows === undefined;

  if (isLoading) {
    return EMPTY;
  }

  // Bucket once per render; row counts are small (≤ 100 in steady
  // state for one conv, so the full scan is cheap). We preserve the
  // caller's sort (Dexie already returned [createdAt ASC]).
  const pending: OutboxRow[] = [];
  const sent: OutboxRow[] = [];
  const failed: OutboxRow[] = [];
  for (const r of rows ?? []) {
    if (r.state === 'pending' || r.state === 'sending') pending.push(r);
    else if (r.state === 'sent') sent.push(r);
    else if (r.state === 'failed') failed.push(r);
  }

  return {
    pending,
    sent,
    failed,
    total: (rows ?? []).length,
    isLoading,
  };
}

/**
 * Total-pending counter across ALL conversations. Useful for an
 * app-level "N pending" footer status / app icon badge in M5-2.
 *
 * NOT used by the per-row ConversationListItem counters (those use
 * the bucketed view in `useOutbox(convId)`). This counter is purely
 * a "global" introspection.
 */
export function useTotalOutboxCount(): number {
  // useLiveQuery's first arg runs the query; passing a static `[]`
  // deps means "rerun on any outbox table change".
  const count = useLiveQuery(
    async () => {
      const db = getDb();
      const all = await db.outbox.toArray();
      let n = 0;
      const now = Date.now();
      for (const r of all) {
        if (r.state === 'pending' || r.state === 'sending') {
          n += 1;
          continue;
        }
        if (r.state === 'failed') {
          n += 1;
          continue;
        }
        if (
          r.state === 'sent' &&
          (r.sentAt === null || now - r.sentAt < SENT_GRACE_MS)
        ) {
          n += 1;
        }
      }
      return n;
    },
    [],
    0,
  );
  return count ?? 0;
}

/**
 * Manual re-render trigger for callers that need a sticky refresh
 * signal from outside React (e.g. the SW bg sync replay path emits
 * a `BroadcastChannel` message that the M5-2 hook will eventually
 * forward to this setter).
 *
 * Implementation note: `useLiveQuery` already re-runs on every
 * outbox table change, so this is a SAFETY HATCH — the function is
 * unused in M5-1 but the mount point is reserved for M5-2 SW
 * action. Keep; do not delete until M5-2 wires it up or marks it
 * obsolete in the JSDoc above.
 */
export function useOutboxManualRefresh(): () => void {
  const [, setTick] = useState(0);
  useEffect(() => {
    // Subscribers to native refresh signals will be wired here in
    // M5-2 (SW BroadcastChannel) — currently a documented no-op.
  }, []);
  return () => setTick((n) => n + 1);
}
