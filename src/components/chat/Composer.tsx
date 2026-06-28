import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type DragEvent,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { useTranslation } from 'react-i18next';
import {
  useSendAttachmentMessage,
  ATTACHMENT_MIME_WHITELIST,
  AttachmentValidationError,
  MAX_ATTACHMENT_BYTES,
  isImageMime,
} from '@/lib/api/chat';
import { useAuth } from '@/stores/useAuth';
import { useChat } from '@/stores/useChat';
import { useDraftInput } from '@/hooks/useDraftInput';
import { useTypingBroadcast } from '@/hooks/useTypingBroadcast';
import { useSendReplyMessage } from '@/hooks/useSendReplyMessage';
import { ComposeReplyCard } from './ComposeReplyCard';

/**
 * Composer — M3-4 "floating island" chat composer (DESIGN § 7 form B).
 *
 * Surfaces:
 * - Optional reply preview card on top (uses `useChat.replyingTo`)
 * - Auto-grow textarea (radius 16 px, surface-2 bg, shadow-2 lifted look)
 * - Image attach button + file attach button (hidden file inputs)
 * - Send button (accent on non-empty draft)
 * - Drag-and-drop + paste-from-clipboard ⇒ same handler as attach button
 *
 * Behaviour:
 * - Draft retention via `useDraftInput` (localStorage debounced by convId)
 * - Send via `useSendTextMessage` / `useSendAttachmentMessage` mutations
 *   (cache-injected optimistic bubbles per ADR-014)
 * - On successful send: localStorage draft cleared, optimistic bubble is
 *   replaced with the canonical server row on success and rolled back on error
 *
 * Outbox + retry queue is deferred to M5-1/2/3; for M3-4 we display errors
 * inline (a single accent-error strip above the input) and let the user
 * re-submit manually.
 */

interface ComposerProps {
  conversationId: string;
}

interface LocalError {
  message: string;
}

const TEXTAREA_MAX_HEIGHT = 144; // px — mirrors DESIGN § 7 form B
const MIN_DRAFT_LEN_FOR_SEND = 1; // any non-whitespace

function generateClientMsgId(): string {
  return crypto.randomUUID();
}

export function Composer({ conversationId }: ComposerProps) {
  const { t, i18n } = useTranslation();
  const selfUserId =
    useAuth((s) => s.profile?.id ?? s.session?.user.id ?? null) ?? '';

  const replyingTo = useChat((s) => s.replyingTo);
  const clearReply = useChat((s) => s.clearComposer);
  const setReplyingTo = useChat((s) => s.setReplyingTo);

  const { draft, setDraft, clearDraft } = useDraftInput(conversationId);

  // M4-6 — useSendReplyMessage is a thin wrapper around the M3-4 text
  // send hook that automatically reads `replyingTo` from Zustand and
  // dispatches via `fn_send_reply_message` RPC when present (R-14 +
  // R-15 enforced server-side). It also clears the Zustand reply on
  // success (and PRESERVES it on error so the user can retry).
  const sendTextM = useSendReplyMessage(conversationId, selfUserId);
  const sendAttachM = useSendAttachmentMessage(conversationId, selfUserId);

  /**
   * M4-1 typing broadcast: pairs with ChatPanel's `useTypingReceivers`
   * (supabase-js dedupes the `presence:<conversationId>` channel by name
   * so we share one instance between broadcast + receive sides).
   * - `startTyping():` re-arms the 5 s idle window on each keystroke; the
   *   underlying hook debounces so `track({typing:true})` only fires
   *   ONCE per quiet gap.
   * - `stopTyping():` called on send, attach, blur, and unmount.
   */
  const { startTyping, stopTyping } = useTypingBroadcast({
    conversationId,
    selfUserId: selfUserId || null,
  });

  const [error, setError] = useState<LocalError | null>(null);

  const taRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isBusy = sendTextM.isPending || sendAttachM.isPending;

  // Auto-grow the textarea whenever the draft changes.
  useLayoutEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const next = Math.min(el.scrollHeight, TEXTAREA_MAX_HEIGHT);
    el.style.height = `${next}px`;
  }, [draft]);

  /** Reset focus on conversationId change so the user can keep typing. */
  useEffect(() => {
    taRef.current?.focus({ preventScroll: true });
  }, [conversationId]);

  const handleSend = useCallback(
    async (body: string) => {
      if (!selfUserId) {
        setError({ message: t('errors.unauthorized') });
        return;
      }
      const trimmed = body.trim();
      if (!trimmed) return;
      // Clear typing eagerly so the receiver shows the message bubble as
      // the user expects — `stopTyping()` is idempotent if already idle.
      stopTyping();
      const clientMsgId = generateClientMsgId();
      try {
        // The wrapper `useSendReplyMessage` internally threads the
        // Zustand `replyingTo.id` as `replyToId` AND clears the reply
        // target on success — Composer no longer needs to do this
        // manually. `replyToId` lookup has moved into the hook.
        await sendTextM.mutateAsync({
          body: trimmed,
          clientMsgId,
        });
        clearDraft();
        setError(null);
      } catch (e) {
        setError({
          message:
            e && typeof e === 'object' && 'message' in e
              ? String((e as { message: string }).message)
              : t('composer.sendFailed'),
        });
      }
    },
    [
      selfUserId,
      sendTextM,
      clearDraft,
      t,
      stopTyping,
    ],
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void handleSend(draft);
  };

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends; Shift+Enter inserts a newline (vs. the F-UI-friendly
    // "Cmd+Enter sends" found in some clones — Nook's preference is the
    // more discoverable plain Enter per the SPEC § 6 BF-05 wording).
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void handleSend(draft);
    }
  };

  /**
   * M4-1 keystroke fan-out: writes the new draft AND arms the typing
   * debounce. Only fires `startTyping()` when the draft becomes
   * non-empty — avoids the conv-switch startup flicker where Composer
   * re-mounts with hydration content loaded.
   */
  const handleDraftChange = useCallback(
    (next: string) => {
      setDraft(next);
      if (next.length > 0) startTyping();
    },
    [setDraft, startTyping],
  );

  /** M4-1 explicit stop on outer click / tab switch (mirrors 5 s idle). */
  const handleBlur = useCallback(() => {
    stopTyping();
  }, [stopTyping]);

  const dispatchFile = useCallback(
    async (file: File) => {
      if (!selfUserId) {
        setError({ message: t('errors.unauthorized') });
        return;
      }
      // Attachment send = user finished an action, so we stop typing
      // (file content isn't tracked in the typing payload, but the
      // state machine is symmetric with text send).
      stopTyping();
      try {
        const kind = isImageMime(file.type) ? 'image' : 'file';
        const clientMsgId = generateClientMsgId();
        await sendAttachM.mutateAsync({
          file,
          kind,
          replyToId: replyingTo?.id ?? null,
          clientMsgId,
        });
        clearReply();
        setError(null);
      } catch (e) {
        if (e instanceof AttachmentValidationError) {
          setError({ message: humanizeAttachError(e, t) });
        } else if (
          e &&
          typeof e === 'object' &&
          'code' in e &&
          'message' in e
        ) {
          setError({ message: String((e as { message: string }).message) });
        } else {
          setError({ message: t('composer.sendFailed') });
        }
      }
    },
    [selfUserId, sendAttachM, replyingTo, clearReply, t, stopTyping],
  );

  const onPickImage = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) void dispatchFile(file);
  };

  const onPickFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) void dispatchFile(file);
  };

  const onPaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(e.clipboardData?.files ?? []);
    if (files.length === 0) return;
    e.preventDefault();
    void dispatchFile(files[0]!);
  };

  const [isDragging, setIsDragging] = useState(false);
  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    if (Array.from(e.dataTransfer.types).includes('Files')) {
      e.preventDefault();
      if (!isDragging) setIsDragging(true);
    }
  };
  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    if (e.currentTarget === e.target) setIsDragging(false);
  };
  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void dispatchFile(file);
  };

  const canSend =
    draft.trim().length >= MIN_DRAFT_LEN_FOR_SEND && !isBusy;

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={[
        'relative',
        // breathing room on PC (DESIGN § 7: 24px bottom + sides)
        'px-[var(--space-md)] md:px-[var(--space-xl)] pb-[var(--space-xl)]',
        // raised drop hint overlay when dragging a file over the composer
        isDragging ? 'outline-dashed' : '',
      ].join(' ')}
    >
      {/* Reply preview card — rendered only when a reply target is active */}
      {replyingTo && (
        <ComposeReplyCard
          preview={replyingTo}
          onCancel={() => setReplyingTo(null)}
        />
      )}

      {isDragging && (
        <div
          aria-hidden="true"
          className={[
            'pointer-events-none absolute inset-[var(--space-sm)]',
            'rounded-[var(--radius-xl)] border-2 border-dashed',
            'border-[var(--color-accent-soft-ring)]',
            'bg-[var(--color-accent-soft-bg)]',
          ].join(' ')}
        />
      )}

      {error && (
        <p
          role="alert"
          className={[
            'mb-[var(--space-xs)] rounded-[var(--radius-md)]',
            'border border-[var(--color-signal-error)]',
            'bg-[var(--color-surface-1)]',
            'px-[var(--space-sm)] py-[var(--space-2xs)]',
            'text-[var(--font-size-meta)] text-[var(--color-signal-error)]',
          ].join(' ')}
        >
          {error.message}
        </p>
      )}

      <form
        onSubmit={handleSubmit}
        // floating island (DESIGN § 7 form B)
        className={[
          'flex items-end gap-[var(--space-xs)]',
          'bg-[var(--color-surface-2)]',
          'border border-[var(--color-hairline-default)]',
          'rounded-[var(--radius-xl)]',
          'shadow-[var(--shadow-2)]',
          'px-[var(--space-sm)] py-[var(--space-xs)]',
          'focus-within:border-[var(--color-accent-soft-ring)]',
          'transition-[border-color] duration-[var(--transition-hover)]',
        ].join(' ')}
      >
        {/* Attach image button (round, 32 px) */}
        <IconButton
          ariaLabel={t('composer.attachImage')}
          title={t('composer.attachImage')}
          disabled={isBusy}
          onClick={() => imageInputRef.current?.click()}
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>
          }
        />
        <input
          ref={imageInputRef}
          type="file"
          hidden
          accept="image/png,image/jpeg,image/heic,image/webp"
          onChange={onPickImage}
        />

        {/* Attach file button */}
        <IconButton
          ariaLabel={t('composer.attachFile')}
          title={t('composer.attachFile')}
          disabled={isBusy}
          onClick={() => fileInputRef.current?.click()}
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 17.93 8.8l-8.57 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          }
        />
        <input
          ref={fileInputRef}
          type="file"
          hidden
          accept={ATTACHMENT_MIME_WHITELIST.join(',')}
          onChange={onPickFile}
        />

        {/* Auto-grow textarea — replaces the Input variant=composer wrapper
            because we need a ref-attached scrollHeight pump. Geometry copies
            the Input.tsx composer variant exactly per DESIGN § 7. */}
        <textarea
          ref={taRef}
          value={draft}
          onChange={(e) => handleDraftChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={onPaste}
          onBlur={handleBlur}
          placeholder={placeholderFor(i18n.language, replyingTo)}
          disabled={isBusy}
          aria-label={t('composer.inputLabel')}
          rows={1}
          lang={i18n.language || 'zh-CN'}
          className={[
            'flex-1 min-w-0 resize-none',
            'bg-transparent outline-none',
            'text-[var(--font-size-body-lg)] leading-[var(--leading-chill)]',
            'text-[var(--color-ink-default)]',
            'placeholder:text-[var(--color-ink-subtle)]',
            'py-[var(--space-sm)] px-[var(--space-xs)]',
            'min-h-[44px] max-h-[144px]',
            // override focus-visible chrome — the outer island surface is
            // the focus surface instead
            'focus-visible:outline-none',
          ].join(' ')}
        />

        {/* Send (accent) button — disabled until draft has content */}
        <button
          type="submit"
          aria-label={t('composer.send')}
          title={t('composer.send')}
          disabled={!canSend}
          className={[
            'flex-shrink-0',
            'h-[36px] w-[36px] rounded-[12px]',
            'flex items-center justify-center',
            'transition-[background-color,transform] duration-[var(--transition-hover)]',
            canSend
              ? 'bg-[var(--color-accent-default)] text-[var(--color-on-accent)] hover:bg-[var(--color-accent-hover)] active:scale-[0.97]'
              : 'bg-[var(--color-surface-1)] text-[var(--color-ink-subtle)] cursor-not-allowed',
            'focus-visible:outline-[2px] focus-visible:outline-[var(--color-accent-soft-ring)] focus-visible:outline-offset-[2px]',
          ].join(' ')}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </form>
    </div>
  );
}

// ----------------------------------------------------------------------------
// internal subcomponents
// ----------------------------------------------------------------------------

interface IconButtonProps {
  ariaLabel: string;
  title: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}

function IconButton({
  ariaLabel,
  title,
  icon,
  onClick,
  disabled,
}: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      title={title}
      className={[
        'flex-shrink-0',
        'h-[32px] w-[32px] rounded-full',
        'flex items-center justify-center',
        'text-[var(--color-ink-muted)]',
        'hover:bg-[var(--color-surface-3)] hover:text-[var(--color-ink-default)]',
        'active:bg-[var(--color-surface-4)]',
        'transition-colors duration-[var(--transition-hover)]',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        'focus-visible:outline-[2px] focus-visible:outline-[var(--color-accent-soft-ring)] focus-visible:outline-offset-[2px]',
      ].join(' ')}
    >
      {icon}
    </button>
  );
}

function placeholderFor(
  language: string,
  replyingTo: { senderName: string } | null,
): string {
  if (replyingTo) {
    return language.startsWith('zh')
      ? `回复 ${replyingTo.senderName}…`
      : `Reply to ${replyingTo.senderName}…`;
  }
  return language.startsWith('zh') ? '说点什么…' : 'Say something…';
}

/**
 * Map AttachmentValidationError codes to a localized, human-friendly message
 * for the inline error strip. Falls back to the raw error's `message` so DB /
 * storage errors are still surfaced verbatim.
 */
function humanizeAttachError(
  err: AttachmentValidationError,
  t: (key: string) => string,
): string {
  switch (err.code) {
    case 'EMPTY_FILE':
      return t('composer.fileEmpty');
    case 'TOO_LARGE':
      return t('composer.fileTooLarge', {
        size: Math.round(MAX_ATTACHMENT_BYTES / 1024 / 1024),
      });
    case 'UNSUPPORTED_MIME':
      return t('composer.fileUnsupported');
    case 'MISSING_MIME':
      return t('composer.fileUnsupported');
    default:
      return err.message;
  }
}
