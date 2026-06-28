import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { REACTION_EMOJIS } from '@/lib/api/chat';
import type { ReactionEmoji } from '@/shared/types/domain';
import { useClickOutside } from '@/hooks/useClickOutside';

/**
 * M4-7 — `<EmojiPicker>` — the hover/click-revealed popover that lets
 * the current user apply one of the closed 6 emoji reactions (CAP-15).
 *
 * UX:
 *   - Hover the `ReactionMenuTrigger` button → opens the popover with
 *     a 200 ms delay (anti-accidental-flicker on cursor traversal).
 *   - Click the trigger → toggles the popover open/closed (so mobile
 *     users — who have no hover — can still get in).
 *   - Click an emoji in the popover → closes + routes the toggle
 *     through the parent's `onToggle` handler with `action: 'add'`.
 *   - Click-outside OR Escape → dismisses the popover silently.
 *   - Re-click the trigger while open → closes without action.
 *
 * Visual:
 *   - `surface-2` background, `radius-lg` corners, soft drop shadow.
 *   - Single horizontal row of 6 emoji buttons, evenly spaced.
 *   - The 6 emojis are the canonical RP-15 whitelist — same set
 *     enforced server-side by the CHECK on `reactions.emoji`.
 *
 * Accessibility:
 *   - Trigger is a `button` with `aria-haspopup`, `aria-expanded`.
 *   - Popover is `role="dialog"` with `aria-label`.
 *   - Each emoji button has `aria-label` from the i18n catalogue.
 *   - Escape key dismisses (focus-trap is intentionally minimal — the
 *     popover is short-lived enough that focus returning to the
 *     trigger is sufficient).
 */
interface EmojiPickerProps {
  selfHasMine: ReadonlyArray<ReactionEmoji>;
  onAdd: (emoji: ReactionEmoji) => void;
  /** Whether the toggle trigger is currently disabled (e.g. message recalled). */
  disabled?: boolean;
}

const HOVER_OPEN_DELAY_MS = 200;

export function EmojiPicker({
  selfHasMine,
  onAdd,
  disabled = false,
}: EmojiPickerProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const hoverTimerRef = useRef<number | null>(null);

  // Dismiss on click-outside.
  useClickOutside(popoverRef, () => setOpen(false));

  // Dismiss on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  // Cancel any pending hover-open timer on unmount so we don't leak.
  useEffect(() => {
    return () => {
      if (hoverTimerRef.current !== null) {
        window.clearTimeout(hoverTimerRef.current);
      }
    };
  }, []);

  const triggerClick = () => {
    if (disabled) return;
    setOpen((prev) => !prev);
  };

  const triggerPointerEnter = () => {
    if (disabled) return;
    if (hoverTimerRef.current !== null) {
      window.clearTimeout(hoverTimerRef.current);
    }
    hoverTimerRef.current = window.setTimeout(() => {
      setOpen(true);
      hoverTimerRef.current = null;
    }, HOVER_OPEN_DELAY_MS);
  };

  const triggerPointerLeave = () => {
    // Don't auto-close on leave — the user's pointer may travel to the
    // popover; click-outside below handles dismissal after a true exit.
    if (hoverTimerRef.current !== null) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  };

  const handleEmojiClick = (emoji: ReactionEmoji) => {
    // The picker ONLY adds — toggling off is done by clicking the chip
    // in the <Reactions> row below the bubble. So we filter already-owned
    // emojis here (the picker appears consistent with Slack/Discord
    // where you can't "unreact" by hovering the same emoji again).
    if (selfHasMine.includes(emoji)) return;
    onAdd(emoji);
    setOpen(false);
  };

  const a11yDescriptionId = 'emoji-picker-popover-desc';

  return (
    <span className="relative inline-flex">
      <button
        ref={triggerRef}
        type="button"
        onClick={triggerClick}
        onPointerEnter={triggerPointerEnter}
        onPointerLeave={triggerPointerLeave}
        onFocus={triggerPointerEnter}
        onBlur={triggerPointerLeave}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? a11yDescriptionId : undefined}
        aria-label={t('chat.reaction.triggerLabel')}
        title={t('chat.reaction.triggerLabel')}
        className={[
          'flex h-6 w-6 items-center justify-center rounded-full',
          'text-[var(--color-ink-muted)]',
          'opacity-0 transition-opacity duration-150',
          'group-hover/message:opacity-100',
          'group-focus-within/message:opacity-100',
          'hover:text-[var(--color-ink-fg)]',
          'focus-visible:opacity-100 focus-visible:outline-none',
          'focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40',
          'disabled:opacity-30 disabled:cursor-not-allowed',
        ].join(' ')}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          {/* Round face with two dots + smile = "add reaction" */}
          <circle
            cx="8"
            cy="8"
            r="6.5"
            stroke="currentColor"
            strokeWidth="1.4"
            fill="none"
          />
          <circle cx="5.7" cy="6.5" r="0.9" fill="currentColor" />
          <circle cx="10.3" cy="6.5" r="0.9" fill="currentColor" />
          <path
            d="M5.4 9.6c.5 1.1 1.5 1.7 2.6 1.7s2.1-.6 2.6-1.7"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </button>

      {open && (
        <div
          ref={popoverRef}
          id={a11yDescriptionId}
          role="dialog"
          aria-label={t('chat.reaction.pickerTitle')}
          className={[
            'absolute z-20',
            // Position: above the trigger (close to the bubble's top),
            // centered horizontally with the trigger.
            'bottom-[calc(100%+var(--space-2xs))]',
            'left-1/2 -translate-x-1/2',
            'bg-[var(--color-surface-2)]',
            'border border-[var(--color-hairline-default)]',
            'rounded-[var(--radius-lg)]',
            'shadow-[var(--shadow-2)]',
            'px-[var(--space-xs)] py-[var(--space-2xs)]',
            'flex gap-[var(--space-2xs)]',
          ].join(' ')}
        >
          {REACTION_EMOJIS.map((emoji) => {
            const owned = selfHasMine.includes(emoji);
            return (
              <button
                key={emoji}
                type="button"
                onClick={() => handleEmojiClick(emoji)}
                aria-label={t('chat.reaction.pickerOption', { emoji })}
                aria-pressed={owned}
                disabled={owned}
                data-emoji={emoji}
                className={[
                  'flex h-7 w-7 items-center justify-center',
                  'rounded-[var(--radius-md)]',
                  'text-[1.2rem]',
                  'transition-[background-color,transform] duration-[var(--transition-hover)]',
                  owned
                    ? 'bg-[var(--color-accent-soft-bg)] cursor-default opacity-90'
                    : 'hover:bg-[var(--color-surface-3)] active:scale-[0.94]',
                  'focus-visible:outline-[2px] focus-visible:outline-[var(--color-accent-soft-ring)] focus-visible:outline-offset-[2px]',
                ].join(' ')}
              >
                {emoji}
              </button>
            );
          })}
        </div>
      )}
    </span>
  );
}
