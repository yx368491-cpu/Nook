import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar } from '@/components/ui/Avatar';
import { Bubble } from '@/components/ui/Bubble';
import { Button } from '@/components/ui/Button';
import { AttachmentImage } from './AttachmentImage';
import {
  isMessageEditable,
  MessageEditError,
  type MessageListItem,
} from '@/lib/api/chat';
import { useEditMessage } from '@/hooks/useEditMessage';

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
 * M4-3 — inline edit form that swaps in for the Bubble body when the
 * user clicks the edit affordance. Auto-focuses the textarea, selects
 * existing text, and supports Esc-to-cancel + Cmd/Ctrl+Enter to save
 * (per accessibility — SPEC AC.13).
 *
 * Save button is disabled while:
 *   - the body is whitespace-only
 *   - the body is unchanged from the original
 *   - the mutation is in flight
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

  // M4-3 a11y: focus + select on mount; Esc cancels; Cmd/Ctrl+Enter saves.
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
 * Map a M4-3 edit-mutation error to a localized, user-readable strip
 * message. The server returns stable codes via `MessageEditError.code`
 * (or, fallback, a generic Error).
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
  if (err.message === 'EMPTY_BODY') return t('chat.editError.empty');
  return t('chat.editError.unknown');
}

export function MessageItem({ item, isConsecutive }: MessageItemProps) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const editMutation = useEditMessage(item.conversationId);

  // Live "now" re-derivation: the bubble's edit window expires precisely
  // when created_at + EDIT_WINDOW_MS passes. We re-evaluate every 30 s
  // so a bubble that was editable a moment ago cleanly hides the trigger.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!item.isSelf || !item.createdAt) return;
    const elapsed = Date.now() - Date.parse(item.createdAt);
    if (elapsed >= 2 * 60 * 1000) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 30_000);
    return () => window.clearInterval(id);
  }, [item.isSelf, item.createdAt]);

  // Sender name shown on first message in a run from each sender (group/channels
  // mostly; also covers 1:1 where the avatar alone identifies the other person).
  const showSender = !item.isSelf && !isConsecutive;

  // F-MSG-07: only the sender sees the deleted placeholder
  const isSelfDeleted = item.deletedBySenderAt !== null && item.isSelf;

  // M4-3: editable iff isMessageEditable() AND kind === 'text'
  const canEdit =
    !isSelfDeleted &&
    item.kind === 'text' &&
    isMessageEditable(item);

  const enterEdit = () => {
    setEditError(null);
    setEditing(true);
  };
  const cancelEdit = () => {
    setEditError(null);
    setEditing(false);
  };
  const saveEdit = (newBody: string) => {
    setEditError(null);
    editMutation.mutate(
      { messageId: item.id, newBody },
      {
        onSuccess: () => {
          setEditing(false);
        },
        onError: (err) => {
          setEditError(errorMessageFor(err, t));
          // If the server rejected because the window expired mid-edit,
          // collapse the form back to read-only so the user can see the
          // current (un-edited) body.
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
          {canEdit && !editing && (
            <EditMenuTrigger onClick={enterEdit} />
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
                errorMessage={editError}
              />
            </Bubble>
          ) : (
            <Bubble
              kind={item.isSelf ? 'self' : 'friend'}
              isConsecutive={isConsecutive}
            >
              {isSelfDeleted ? (
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
                // File typing comes in M5-7 (M3-3 placeholder = unsupported marker)
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
