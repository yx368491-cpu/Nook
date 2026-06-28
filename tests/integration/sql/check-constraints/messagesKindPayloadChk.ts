/**
 * Static mirror of the `messages_kind_payload_chk` CHECK constraint
 * introduced in supabase/migrations/20260628000011_relax_kind_payload_chk_for_recall.sql.
 *
 * Per docs/03_Engineering/AI_HANDOVER § S29.0 (Docker permanently retired),
 * Nook verifies SQL invariants statically on this dev machine. This file
 * is a typed-mirror of the SQL CHECK so we can document + assert each of
 * the 6 (kind × state) combinations and the defense-in-depth rejection
 * paths without spinning up a real PostgreSQL instance.
 *
 * The mirror is intentionally NARROW-STATEMENT: only reflects 0011's
 * `messages_kind_payload_chk`. The broader message-body length constraint
 * (1..4000 char_length) is a separate invariant enforced by another CHECK
 * on the messages table and is NOT mirrored here.
 *
 * ⚠️ IF YOU EDIT THIS FILE, ALSO EDIT migration 0011's CHECK definition.
 *    The two must agree branch-for-branch.
 */

type MessageKindLiteral = 'text' | 'image' | 'file' | 'system';

export interface MessageInvariantRow {
  kind: MessageKindLiteral;
  body: string | null;
  attachment_id: string | null;
  recalled_at: string | null; // ISO 8601. NULL = not recalled.
}

/**
 * Mirror of the 'soft-recalled' sentinel body used by fn_recall_message
 * (migration 0010) and exported from src/lib/api/chat.ts as
 * RECALLED_BODY_SENTINEL. Kept inline here to keep this test file
 * self-contained (no cross-import from src/lib/) — IF the sentinel
 * changes, both chat.ts AND this mirror must update.
 */
export const RECALLED_BODY_SENTINEL = '__recalled__';

/** Branch labels for diagnostic readability — match the SQL ordering. */
export type MessagesKindPayloadBranch = 'A' | 'B' | 'C' | 'D';

export interface MessagesKindPayloadEvaluation {
  /** True iff the row satisfies at least one CHECK branch. */
  passes: boolean;
  /** The branch label that satisfied this row, or `null` on rejection. */
  branch: MessagesKindPayloadBranch | null;
  /**
   * Human-readable explanation. On rejection, names the FIRST guard that
   * fired so the test assertion can target specific invariants.
   */
  reason: string;
}

/**
 * Branch matrix — keep these in sync with the SQL definition in
 * migration 0011. The branches are listed in the same priority the
 * CHECK uses (top-to-bottom matches a straight `OR`).
 *
 *   A · text normal            — body non-null, attachment_id null, recalled_at null
 *   B · system (immutable)     — body null, attachment_id null
 *                                recalled_at is NOT constrained by B; system
 *                                messages are server-created and are NEVER
 *                                recalled (fn_recall_message guard #4 + D's
 *                                kind <> 'system' exclusion).
 *   C · image / file normal    — body null, attachment_id NOT null, recalled_at null
 *   D · soft-recalled          — kind <> 'system' (text / image / file),
 *                                recalled_at NOT null, body = '__recalled__'
 *
 * @see supabase/migrations/20260628000011_relax_kind_payload_chk_for_recall.sql
 */
export function evaluateMessagesKindPayloadChk(
  row: MessageInvariantRow,
): MessagesKindPayloadEvaluation {
  // ─── Branch A · normal text message ────────────────────────────────
  // SQL: `body IS NOT NULL` — matches both `''` and `'something'`.
  // Body-length 1..4000 is enforced by a SEPARATE CHECK on messages
  // (not part of kind_payload_chk) and is NOT mirrored here.
  if (
    row.kind === 'text' &&
    row.body !== null &&
    row.attachment_id === null &&
    row.recalled_at === null
  ) {
    return {
      passes: true,
      branch: 'A',
      reason: 'normal text (body required, attachment_id null)',
    };
  }

  // ─── Branch B · system message (immutable) ─────────────────────────
  if (
    row.kind === 'system' &&
    row.body === null &&
    row.attachment_id === null
  ) {
    return {
      passes: true,
      branch: 'B',
      reason: 'system (always body=null, attachment_id=null; never recalled)',
    };
  }

  // ─── Branch C · normal image/file message ──────────────────────────
  // SQL: `body IS NULL` — attachments store all bytes externally;
  // the message body MUST be null, the attachment_id points at the
  // uploaded file in the `attachments` bucket.
  if (
    (row.kind === 'image' || row.kind === 'file') &&
    row.body === null &&
    row.attachment_id !== null &&
    row.recalled_at === null
  ) {
    return {
      passes: true,
      branch: 'C',
      reason: 'normal image/file (body=null, attachment_id required)',
    };
  }

  // ─── Branch D · soft-recalled any user-facing kind ────────────────
  // The `kind <> 'system'` exclusion is the defense-in-depth against
  // a service_role bypass of fn_recall_message guard #4 (`kind != 'system'`).
  // Without this exclusion, a system row with `(recalled_at, body='__recalled__')`
  // would silently pass via branch D — violating the system-is-immutable invariant.
  if (
    row.kind !== 'system' &&
    row.recalled_at !== null &&
    row.body === RECALLED_BODY_SENTINEL
  ) {
    return {
      passes: true,
      branch: 'D',
      reason: 'soft-recalled (body is sentinel, recalled_at set)',
    };
  }

  // ─── No branch matched → CHECK constraint rejection ────────────────
  return {
    passes: false,
    branch: null,
    reason: rejectReason(row),
  };
}

/**
 * Diagnostic for rows that failed the CHECK. The messages target
 * specific invariants from the migration's error surface so callers
 * can branch on the failure mode.
 */
function rejectReason(row: MessageInvariantRow): string {
  if (row.kind === 'text') {
    if (row.body === null) {
      return 'text requires body non-null';
    }
    if (row.attachment_id !== null) {
      return 'text may not have attachment_id';
    }
    if (row.recalled_at !== null && row.body !== RECALLED_BODY_SENTINEL) {
      return "text recalled rows must have body = '__recalled__'";
    }
    return 'text row matched no branch';
  }
  if (row.kind === 'system') {
    // Defense-in-depth flag — IF a service_role bypass tries to recall a
    // system message, branch D's `kind <> 'system'` exclusion fires the
    // CHECK. Surface this explicitly so the rejection is unambiguous.
    if (row.recalled_at !== null && row.body === RECALLED_BODY_SENTINEL) {
      return 'system-recall BLOCKED by branch D exclusion (kind <> system)';
    }
    if (row.body !== null) {
      return 'system requires body null';
    }
    if (row.attachment_id !== null) {
      return 'system requires attachment_id null';
    }
    return 'system row matched no branch';
  }
  // image / file
  if (row.recalled_at === null) {
    if (row.body !== null) {
      return 'normal image/file requires body null';
    }
    if (row.attachment_id === null) {
      return 'normal image/file requires attachment_id non-null';
    }
  } else {
    if (row.body !== RECALLED_BODY_SENTINEL) {
      return "recalled image/file must have body = '__recalled__'";
    }
  }
  return 'image/file row matched no branch';
}
