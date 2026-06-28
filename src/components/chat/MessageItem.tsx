import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar } from '@/components/ui/Avatar';
import { Bubble } from '@/components/ui/Bubble';
import { Button } from '@/components/ui/Button';
import { AttachmentImage } from './AttachmentImage';
import {
  isMessageEditable,
  isMessageRecallable,
  isMessageDeletable,
  MessageEditError,
  MessageRecallError,
  MessageDeleteError,
  type MessageListItem,
} from '@/lib/api/chat';
import { useEditMessage } from '@/hooks/useEditMessage';
import { useRecallMessage } from '@/hooks/useRecallMessage';
import { useDeleteMessage } from '@/hooks/useDeleteMessage';

interface MessageItemProps {
  item: MessageListItem;
  /**
   * `true` when this message follows another by the same sender within a
   * short window (≤ 5 min) — controls bubble spacing / avatar / sender
   * name visibility (i.e. compact consecutive mode).
   */
  isConsecutive: boolean;
}

/**
 * Self-deleted placeholder body. Per F-MSG-07 sender-only soft delete:
 * `deleted_by_sender_at` hides the body *only* for the sender's view;
 * recipients continue to see the original content unchanged.
 */
function SelfDeletedBody({ placeholder }: { placeholder: string }) {
  return (
    <span className="italic text-[var(--color-ink-muted)] font-[var(--font-weight-meta,400)]">
      {placeholder}
    </span>
  );
}

/**
 * M4-3 — small 16 px edit affordance that appears on hover (and keyboard
 * focus) of a self-owned editable text message. Spec'd per DESIGN § 9.5:
 * neutral ink-muted ghost icon, scales to var(--space-ink-fg) on hover,
 * respects reduced-motion.
 *
 * Mount-only when the message passes `isMessageEditable` so the trigger
 * disappears the moment the 2-minute window closes (no flashback).
 */
function EditMenuTrigger({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t('chat.edit')}
      title={t('chat.edit')}
      className="
        flex h-6 w-6 items-center justify-center rounded-full
        text-[var(--color-ink-muted)]
        opacity-0 transition-opacity duration-150
        group-hover/message:opacity-100 group-focus-within/message:opacity-100
        hover:text-[var(--color-ink-fg)]
        focus-visible:opacity-100 focus-visible:outline-none
        focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40
      "
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M11.5 2.5l2 2-7 7-2.5.5.5-2.5 7-7z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M3 13.5h10"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}

/**
 * M4-4 — small 16 px recall (↶ counter-clockwise) affordance, paralleling
 * `EditMenuTrigger`. Mount-only when `isMessageRecallable` so the trigger
 * disappears the moment the 2-minute window closes. The icon is a
 * counter-clockwise arc + arrowhead (thinker decision #5).
 */
function RecallMenuTrigger({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t('chat.recall')}
      title={t('chat.recall')}
      className="
        flex h-6 w-6 items-center justify-center rounded-full
        text-[var(--color-ink-muted)]
        opacity-0 transition-opacity duration-150
        group-hover/message:opacity-100 group-focus-within/message:opacity-100
        hover:text-[var(--color-ink-fg)]
        focus-visible:opacity-100 focus-visible:outline-none
        focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40
      "
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
      >
        {/* Counter-clockwise arc + arrowhead = undo / withdraw symbol */}
        <path
          d="M11 4a5 5 0 1 0 1.5 6"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M11 2v3h-3"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </button>
  );
}

/**
 * M4-5 — small 16 px delete (🗑 trash) affordance, paralleling
 * `EditMenuTrigger` + `RecallMenuTrigger`. Mount-only when
 * `isMessageDeletable` so the trigger disappears the moment the 2-minute
 * sender-only delete window closes. F-MSG-07: the delete is SENDER-ONLY —
 * the recipient view is preserved, so this is effectively a "hide from
 * my own history" gesture. The trash-can glyph signals permanent-feel
 * semantics while the implementation is reversible-by-window (server-side
 * window guard means re-deleting past 2 min returns WINDOW_EXPIRED +
 * the row stays intact).
 */
function DeleteMenuTrigger({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t('chat.delete')}
      title={t('chat.delete')}
      className="
        flex h-6 w-6 items-center justify-center rounded-full
        text-[var(--color-ink-muted)]
        opacity-0 transition-opacity duration-150
        group-hover/message:opacity-100 group-focus-within/message:opacity-100
        hover:text-[var(--color-ink-fg)]
        focus-visible:opacity-100 focus-visible:outline-none
        focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40
      "
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
      >
        {/* Trash-can glyph: lid + tray + 3 vertical lines */}
        <path
          d="M3 4h10M6.5 4V2.5h3V4M4.5 4l.7 9.5a1 1 0 0 0 1 1h3.6a1 1 0 0 0 1-1L11.5 4"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M6.7 7v5M9.3 7v5"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}

/**
 * M4-3 — inline edit form (unchanged from prior ship).
 */
interface InlineEditFormProps {
  initialBody: string;
  onSave: (newBody: string) => void;
  onCancel: () => void;
  disabled: boolean;
  errorMessage: string | null;
}

function InlineEditForm({
  initialBody,
  onSave,
  onCancel,
  disabled,
  errorMessage,
}: InlineEditFormProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(initialBody);
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.focus();
    ta.setSelectionRange(0, ta.length);
  }, []);

  const trimmed = draft.trim();
  const unchanged = trimmed === initialBody.trim();
  const empty = trimmed.length === 0;
  const saveDisabled = disabled || empty || unchanged;

  return (
    <div className="flex flex-col gap-[var(--space-xs)] min-w-[280px]">
      <textarea
        ref={taRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={Math.min(6, Math.max(2, draft.split('\n').length))}
        placeholder={t('chat.editPlaceholder')}
        disabled={disabled}
        aria-label={t('chat.edit')}
        className="
          w-full resize-none rounded-[var(--radius-md)]
          bg-[var(--color-bg-elevated)] px-[var(--space-sm)] py-[var(--space-xs)]
          text-[var(--font-size-body)] text-[var(--color-ink-fg)]
          leading-[var(--line-height-body)] font-[var(--font-weight-body)]
          outline-none transition-shadow duration-150
          focus:shadow-[0_0_0_3px_var(--color-accent)]/16
          disabled:opacity-60
        "
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            onCancel();
          } else if (
            (e.metaKey || e.ctrlKey) &&
            e.key === 'Enter' &&
            !saveDisabled
          ) {
            e.preventDefault();
            onSave(trimmed);
          }
        }}
      />
      <div className="flex items-center justify-between gap-[var(--space-xs)]">
        <span
          className="
            text-[var(--font-size-caption)] text-[var(--color-ink-muted)]
            min-h-[1em]
          "
          role={errorMessage ? 'alert' : undefined}
          aria-live="polite"
        >
          {errorMessage ?? ''}
        </span>
        <div className="flex gap-[var(--space-xs)]">
          <Button
            kind="ghost"
            size="sm"
            onClick={onCancel}
            disabled={disabled}
            aria-label={t('common.cancel')}
          >
            {t('common.cancel')}
          </Button>
          <Button
            kind="primary"
            size="sm"
            disabled={saveDisabled}
            onClick={() => onSave(trimmed)}
            aria-label={t('common.save')}
          >
            {t('common.save')}
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Map a M4-3 edit-mutation error + M4-4 recall-mutation error + M4-5
 * delete-mutation error to a localized, user-readable strip message.
 * All three `MessageXxxError` types carry a stable `.code` we map
 * against `chat[editError | recallError | deleteError].<code>` keys.
 */
function errorMessageFor(
  err: Error | null,
  t: (k: string, opts?: Record<string, unknown>) => string,
): string | null {
  if (!err) return null;
  if (err instanceof MessageEditError) {
    switch (err.code) {
      case 'NOT_OWNER':
        return t('chat.editError.notOwner');
      case 'WINDOW_EXPIRED':
        return t('chat.editError.windowExpired');
      case 'ALREADY_EDITED':
        return t('chat.editError.alreadyEdited');
      case 'BAD_KIND':
        return t('chat.editError.badKind');
      case 'NOT_FOUND':
        return t('chat.editError.notFound');
      case 'NO_CHANGE':
        return t('chat.editError.noChange');
      case 'DB_ERROR':
        return t('chat.editError.dbError');
      default:
        return t('chat.editError.unknown');
    }
  }
  if (err instanceof MessageRecallError) {
    switch (err.code) {
      case 'NOT_OWNER':
        return t('chat.recallError.notOwner');
      case 'WINDOW_EXPIRED':
        return t('chat.recallError.windowExpired');
      case 'ALREADY_RECALLED':
        return t('chat.recallError.alreadyRecalled');
      case 'NOT_FOUND':
        return t('chat.recallError.notFound');
      case 'DB_ERROR':
        return t('chat.recallError.dbError');
      default:
        return t('chat.recallError.unknown');
    }
  }
  if (err instanceof MessageDeleteError) {
    switch (err.code) {
      case 'NOT_OWNER':
        return t('chat.deleteError.notOwner');
      case 'WINDOW_EXPIRED':
        return t('chat.deleteError.windowExpired');
      case 'ALREADY_DELETED':
        return t('chat.deleteError.alreadyDeleted');
      case 'NOT_FOUND':
        return t('chat.deleteError.notFound');
      case 'DB_ERROR':
        return t('chat.deleteError.dbError');
      default:
        return t('chat.deleteError.unknown');
    }
  }
  if (err.message === 'EMPTY_BODY') return t('chat.editError.empty');
  return t('chat.editError.unknown');
}

export function MessageItem({ item, isConsecutive }: MessageItemProps) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  // Single error strip covers edit AND recall AND delete errors — they share
  // the same UI affordance (aria-live=polite · role=alert) and the user
  // only sees one operation at a time per message.
  const [actionError, setActionError] = useState<string | null>(null);
  const editMutation = useEditMessage(item.conversationId);
  const recallMutation = useRecallMessage(item.conversationId);
  const deleteMutation = useDeleteMessage(item.conversationId);

  // Live "now" re-derivation: editable + recallable windows both expire
  // precisely when created_at + 2 minutes passes. Re-evaluate every 30 s
  // so a bubble that was actionable a moment ago cleanly hides the triggers.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!item.isSelf || !item.createdAt) return;
    const elapsed = Date.now() - Date.parse(item.createdAt);
    if (elapsed >= 2 * 60 * 1000) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 30_000);
    return () => window.clearInterval(id);
  }, [item.isSelf, item.createdAt]);

  const showSender = !item.isSelf && !isConsecutive;

  // F-MSG-07: only the sender sees the deleted placeholder
  const isSelfDeleted = item.deletedBySenderAt !== null && item.isSelf;

  // M4-4: any party sees the recalled placeholder (recalled_at is global).
  const isRecalled = item.recalledAt !== null;

  // M4-3 / M4-4 / M4-5 affordance gates: editable / recallable / deletable
  // triggers mount only when both the action's UI guard AND the rendered
  // state allow it.
  const canEdit =
    !isSelfDeleted &&
    !isRecalled &&
    item.kind === 'text' &&
    isMessageEditable(item);

  const canRecall =
    !isSelfDeleted &&
    !isRecalled &&
    isMessageRecallable(item);

  // M4-5 — delete is independent of recall (a message may be deleted for
  // the sender's view while remaining globally visible to the recipient).
  // We hide the delete affordance when the bubble is already recalled
  // (recalled wins visually) or already deleted-for-self (no-op trigger).
  const canDelete =
    !isSelfDeleted &&
    !isRecalled &&
    isMessageDeletable(item);

  const enterEdit = () => {
    setActionError(null);
    setEditing(true);
  };
  const cancelEdit = () => {
    setActionError(null);
    setEditing(false);
  };
  const saveEdit = (newBody: string) => {
    setActionError(null);
    editMutation.mutate(
      { messageId: item.id, newBody },
      {
        onSuccess: () => {
          setEditing(false);
        },
        onError: (err) => {
          setActionError(errorMessageFor(err, t));
          if (
            err instanceof MessageEditError &&
            (err.code === 'WINDOW_EXPIRED' ||
              err.code === 'ALREADY_EDITED' ||
              err.code === 'NOT_FOUND')
          ) {
            setEditing(false);
          }
        },
      },
    );
  };

  /**
   * M4-4 click handler for the recall affordance.
   * No confirmation step (per user request — matches WeChat's recall UX
   * where the click is committed immediately). The 5s/2-min window guard
   * + the irreversible nature of recall make the action low-risk for
   * sender-owns-self semantics; the optimistic update gives instant
   * feedback, and an error (e.g. WINDOW_EXPIRED) surfaces below the bubble.
   */
  const handleRecall = () => {
    setActionError(null);
    recallMutation.mutate(
      { messageId: item.id },
      {
        onError: (err) => {
          setActionError(errorMessageFor(err, t));
          // WINDOW_EXPIRED / ALREADY_RECALLED / NOT_FOUND mean the bubble
          // can't actually be recalled — close any open edit form so the
          // user sees the (now read-only) bubble body.
          if (
            err instanceof MessageRecallError &&
            (err.code === 'WINDOW_EXPIRED' ||
              err.code === 'ALREADY_RECALLED' ||
              err.code === 'NOT_FOUND')
          ) {
            setEditing(false);
          }
        },
      },
    );
  };

  /**
   * M4-5 click handler for the delete affordance.
   * No confirmation step (per thinker decision #4 — matches the M4-4
   * recall click-to-commit UX; the 2-min server-side window guard +
   * the sender-only semantics make this low-risk). The optimistic UI
   * patch sets `deletedBySenderAt = <now>` so the bubble switches to
   * the `messages.deleted` placeholder the moment the sender clicks;
   * an error (e.g. WINDOW_EXPIRED) rolls back the patch via
   * `useDeleteMessage.onError` and surfaces below the bubble.
   */
  const handleDelete = () => {
    setActionError(null);
    deleteMutation.mutate(
      { messageId: item.id },
      {
        onError: (err) => {
          setActionError(errorMessageFor(err, t));
          // WINDOW_EXPIRED / ALREADY_DELETED / NOT_FOUND mean the bubble
          // can't actually be deleted — close any open edit form so the
          // user sees the (now read-only) bubble body.
          if (
            err instanceof MessageDeleteError &&
            (err.code === 'WINDOW_EXPIRED' ||
              err.code === 'ALREADY_DELETED' ||
              err.code === 'NOT_FOUND')
          ) {
            setEditing(false);
          }
        },
      },
    );
  };

  return (
    <div
      className={`
        group/message flex w-full gap-[var(--space-xs)]
        px-[var(--space-md)] py-[var(--space-2xs)]
        ${item.isSelf ? 'justify-end' : 'justify-start'}
      `}
      role="listitem"
      aria-label={`${item.senderName} ${new Date(item.createdAt).toLocaleTimeString(
        [],
        { hour: '2-digit', minute: '2-digit', hour12: false },
      )}`}
      data-message-id={item.id}
      data-message-kind={item.kind}
    >
      {!item.isSelf && (
        <Avatar size="sm" src={item.senderAvatarUrl} name={item.senderName} />
      )}

      <div
        className={`
          flex min-w-0 max-w-[72%] flex-col gap-[var(--space-2xs)]
          ${item.isSelf ? 'items-end' : 'items-start'}
        `}
      >
        {showSender && (
          <span className="text-[var(--font-size-micro)] font-[500] text-[var(--color-ink-muted)]">
            {item.senderName}
          </span>
        )}

        <div
          className={`
            flex items-end gap-[var(--space-2xs)]
            ${item.isSelf ? 'flex-row-reverse' : 'flex-row'}
          `}
        >
          {/* Triple hover triggers (M4-3 edit + M4-4 recall + M4-5 delete)
              — side-by-side, each gated by its respective UI guard. Hidden
              when editing so the inline form doesn't collide with the icon
              column. */}
          {!editing && canEdit && (
            <EditMenuTrigger onClick={enterEdit} />
          )}
          {!editing && canRecall && (
            <RecallMenuTrigger onClick={handleRecall} />
          )}
          {!editing && canDelete && (
            <DeleteMenuTrigger onClick={handleDelete} />
          )}

          {editing ? (
            <Bubble
              kind={item.isSelf ? 'self' : 'friend'}
              isConsecutive={isConsecutive}
            >
              <InlineEditForm
                initialBody={item.body ?? ''}
                onSave={saveEdit}
                onCancel={cancelEdit}
                disabled={editMutation.isPending}
                errorMessage={actionError}
              />
            </Bubble>
          ) : (
            <Bubble
              kind={item.isSelf ? 'self' : 'friend'}
              isConsecutive={isConsecutive}
            >
              {isRecalled ? (
                <SelfDeletedBody placeholder={t('chat.recalled')} />
              ) : isSelfDeleted ? (
                <SelfDeletedBody placeholder={t('messages.deleted')} />
              ) : item.kind === 'text' && item.body ? (
                <>
                  <Bubble.Text>{item.body}</Bubble.Text>
                  {item.editedAt && (
                    <span
                      className="
                        ml-[var(--space-xs)] text-[var(--font-size-caption)]
                        italic text-[var(--color-ink-muted)]
                      "
                      title={new Date(item.editedAt).toLocaleString()}
                    >
                      ({t('chat.edited')})
                    </span>
                  )}
                </>
              ) : item.kind === 'image' && item.attachment ? (
                <AttachmentImage
                  storagePath={item.attachment.storagePath}
                  alt={t('chat.imageAlt')}
                  width={item.attachment.width ?? 320}
                  height={item.attachment.height ?? 240}
                />
              ) : (
                item.kind === 'file' && (
                  <span className="text-[var(--font-size-meta)] text-[var(--color-ink-muted)] italic">
                    {t('messages.fileUnsupported')}
                  </span>
                )
              )}
            </Bubble>
          )}
        </div>
      </div>
    </div>
  );
}
