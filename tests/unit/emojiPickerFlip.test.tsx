import type { ReactNode } from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { EmojiPicker } from '@/components/chat/EmojiPicker';
import type { ReactionEmoji } from '@/shared/types/domain';

// ===========================================================================
// i18n mock — EmojiPicker reads `chat.reaction.*` keys; we don't need real
// localized strings, just stable interpolation so role/aria-label queries
// can locate the trigger and dialog.
// ===========================================================================
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts && 'emoji' in opts ? `${key}:${String(opts.emoji)}` : key,
  }),
}));

// ===========================================================================
// `useClickOutside` uses native mousedown/touchstart. jsdom fires both so
// no mock needed.
// ===========================================================================

// ===========================================================================
// DOM rect helper — overrides HTMLElement.prototype.getBoundingClientRect
// so we can deterministically simulate viewport clipping.
// ===========================================================================
function onlyMockMode(popoverMode: 'above' | 'clipped') {
  return vi
    .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
    .mockImplementation(function (this: HTMLElement) {
      // The popover carries `role="dialog"`.
      if (this.getAttribute('role') === 'dialog') {
        if (popoverMode === 'above') {
          // 100 px from viewport top — plenty of room. The popover would
          // not be clipped if positioned above the trigger.
          return {
            top: 100,
            bottom: 132,
            left: 0,
            right: 100,
            width: 100,
            height: 32,
            x: 0,
            y: 100,
            toJSON: () => ({}),
          };
        }
        // 'clipped': top is below 0 → popover would be clipped by viewport
        // top edge in its default above-the-trigger position.
        return {
          top: -10,
          bottom: 22,
          left: 0,
          right: 100,
          width: 100,
          height: 32,
          x: 0,
          y: -10,
          toJSON: () => ({}),
        };
      }
      // Anything else (the trigger button):
      return {
        top: 200,
        bottom: 232,
        left: 0,
        right: 32,
        width: 32,
        height: 32,
        x: 0,
        y: 200,
        toJSON: () => ({}),
      };
    });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('EmojiPicker — viewport-flip (M4-7.1)', () => {
  it('renders popover ABOVE the trigger (default position) when above fits', () => {
    onlyMockMode('above');
    render(<EmojiPicker selfHasMine={[]} onAdd={() => {}} />);
    const trigger = screen.getByRole('button', {
      name: /chat\.reaction\.triggerLabel/,
    });
    fireEvent.click(trigger);
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('data-flip')).toBe('above');
    expect(dialog.className).toContain(
      'bottom-[calc(100%+var(--space-2xs))]',
    );
    expect(dialog.className).not.toContain(
      'top-[calc(100%+var(--space-2xs))]',
    );
  });

  it('flips popover BELOW the trigger when above-the-trigger would clip viewport top', () => {
    onlyMockMode('clipped');
    render(<EmojiPicker selfHasMine={[]} onAdd={() => {}} />);
    const trigger = screen.getByRole('button', {
      name: /chat\.reaction\.triggerLabel/,
    });
    fireEvent.click(trigger);
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('data-flip')).toBe('below');
    expect(dialog.className).toContain(
      'top-[calc(100%+var(--space-2xs))]',
    );
    expect(dialog.className).not.toContain(
      'bottom-[calc(100%+var(--space-2xs))]',
    );
  });

  it('resets flipBelow on close so a re-open re-measures from default position', () => {
    onlyMockMode('clipped');
    const onAdd = vi.fn();
    render(
      <EmojiPicker
        selfHasMine={[] as ReadonlyArray<ReactionEmoji>}
        onAdd={onAdd}
      />,
    );
    const trigger = screen.getByRole('button', {
      name: /chat\.reaction\.triggerLabel/,
    });

    // First open: clipped → expects flipped position
    fireEvent.click(trigger);
    let dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('data-flip')).toBe('below');

    // Toggle close
    fireEvent.click(trigger);
    expect(screen.queryByRole('dialog')).toBeNull();

    // Re-open with the mock now reporting ABOVE — should not carry stale
    // flip state from the first open.
    onlyMockMode('above');
    fireEvent.click(trigger);
    dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('data-flip')).toBe('above');
    expect(dialog.className).toContain(
      'bottom-[calc(100%+var(--space-2xs))]',
    );
  });

  it('honours FLIP_MARGIN_PX (8 px): top == 7 still flips, top == 8 stays above', () => {
    // top == 7 → flipped (boundary BELOW 8 px margin)
    let mock = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect');
    mock.mockImplementation(function (this: HTMLElement) {
      if (this.getAttribute('role') === 'dialog') {
        return {
          top: 7,
          bottom: 39,
          left: 0,
          right: 100,
          width: 100,
          height: 32,
          x: 0,
          y: 7,
          toJSON: () => ({}),
        };
      }
      return {
        top: 200,
        bottom: 232,
        left: 0,
        right: 32,
        width: 32,
        height: 32,
        x: 0,
        y: 200,
        toJSON: () => ({}),
      };
    });
    const { unmount } = render(<EmojiPicker selfHasMine={[]} onAdd={() => {}} />);
    const trigger = screen.getByRole('button', {
      name: /chat\.reaction\.triggerLabel/,
    });
    fireEvent.click(trigger);
    expect(screen.getByRole('dialog').getAttribute('data-flip')).toBe(
      'below',
    );
    unmount();

    // top == 8 → DOES not flip (still within margin)
    mock = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect');
    mock.mockImplementation(function (this: HTMLElement) {
      if (this.getAttribute('role') === 'dialog') {
        return {
          top: 8,
          bottom: 40,
          left: 0,
          right: 100,
          width: 100,
          height: 32,
          x: 0,
          y: 8,
          toJSON: () => ({}),
        };
      }
      return {
        top: 200,
        bottom: 232,
        left: 0,
        right: 32,
        width: 32,
        height: 32,
        x: 0,
        y: 200,
        toJSON: () => ({}),
      };
    });
    render(<EmojiPicker selfHasMine={[]} onAdd={() => {}} />);
    fireEvent.click(
      screen.getByRole('button', { name: /chat\.reaction\.triggerLabel/ }),
    );
    expect(screen.getByRole('dialog').getAttribute('data-flip')).toBe(
      'above',
    );
  });
});
