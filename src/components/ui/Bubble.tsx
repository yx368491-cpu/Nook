import { forwardRef, useState, type HTMLAttributes, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export type BubbleKind = 'self' | 'friend';

export interface BubbleProps extends HTMLAttributes<HTMLDivElement> {
  kind: BubbleKind;
  isConsecutive?: boolean;
  children: ReactNode;
  'data-encrypted'?: 'none' | 'pending' | 'ready';
}

const BubbleRoot = forwardRef<HTMLDivElement, BubbleProps>(
  ({ kind, isConsecutive = false, children, className = '', style, ...props }, ref) => {
    const [entered] = useState(true);

    const baseClasses = [
      'relative px-[14px] py-[10px]',
      'max-w-[72%] min-w-0',
      'text-[var(--font-size-body-lg)] leading-[var(--leading-chill)]',
      'transition-[opacity,transform] duration-[var(--transition-chat-bubble-enter)]',
      kind === 'self'
        ? 'self-end rounded-[var(--chat-bubble-self-radius)] bg-[var(--color-chat-self-bg)] text-[var(--color-chat-self-text)]'
        : 'self-start rounded-[var(--chat-bubble-friend-radius)] bg-[var(--color-chat-friend-bg)] text-[var(--color-chat-friend-text)]',
      isConsecutive ? 'mt-[var(--space-2xs)]' : 'mt-[var(--space-sm)]',
      entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-[8px]',
      className,
    ].join(' ');

    return (
      <div
        ref={ref}
        className={baseClasses}
        role="article"
        style={style}
        {...props}
      >
        {children}
      </div>
    );
  },
);

BubbleRoot.displayName = 'Nook.Bubble';

/* ---------- Sub-components ---------- */

interface BubbleTextProps {
  children: string;
}

function BubbleText({ children }: BubbleTextProps) {
  return <p className="m-0 whitespace-pre-wrap break-words">{children}</p>;
}

interface BubbleImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
}

function BubbleImage({ src, alt, width, height }: BubbleImageProps) {
  if (!alt) {
    console.error('<Bubble.Image> requires an `alt` prop');
  }
  return (
    <img
      src={src}
      alt={alt || 'Image message'}
      width={width}
      height={height}
      className="rounded-[var(--radius-lg)] max-w-full cursor-pointer"
      style={{ maxWidth: 'min(100%, var(--image-max-width, 480px))' }}
      loading="lazy"
    />
  );
}

interface BubbleFileProps {
  name: string;
  sizeBytes: number;
  url: string;
}

function BubbleFile({ name, sizeBytes, url }: BubbleFileProps) {
  const { t } = useTranslation();
  const sizeLabel = sizeBytes < 1_000_000
    ? `${Math.round(sizeBytes / 1024)} KB`
    : `${(sizeBytes / 1_000_000).toFixed(1)} MB`;

  return (
    <div className="flex items-center gap-[var(--space-sm)] bg-[var(--color-surface-2)] rounded-[var(--radius-md)] px-[var(--space-sm)] py-[var(--space-xs)]">
      <div className="flex-1 min-w-0">
        <p className="m-0 text-[var(--font-size-body)] truncate">{name}</p>
        <p className="m-0 text-[var(--font-size-caption)] text-[var(--color-ink-muted)]">{sizeLabel}</p>
      </div>
      <a
        href={url}
        download={name}
        className="flex-shrink-0 text-[var(--color-ink-muted)] hover:text-[var(--color-ink-default)] focus-visible:outline-[2px] focus-visible:outline-[var(--color-accent-soft-ring)] focus-visible:outline-offset-[2px]"
        aria-label={t('common.downloadFile', { name })}
      >
        ⤓
      </a>
    </div>
  );
}

interface BubbleReplyToProps {
  senderName: string;
  preview: string;
}

function BubbleReplyTo({ senderName, preview }: BubbleReplyToProps) {
  return (
    <div className="mb-[var(--space-xs)] pl-[var(--space-xs)] border-l-[2px] border-[var(--color-accent-default)]">
      <p className="m-0 text-[var(--font-size-caption)] font-[500] text-[var(--color-ink-muted)]">
        {senderName}
      </p>
      <p className="m-0 text-[var(--font-size-caption)] truncate text-[var(--color-ink-muted)]">
        {preview}
      </p>
    </div>
  );
}

export type ReactionEmoji = '👍' | '❤️' | '😂' | '👀' | '🔥' | '🙏';

interface ReactionItem {
  emoji: ReactionEmoji;
  count: number;
}

interface BubbleReactionsProps extends HTMLAttributes<HTMLDivElement> {
  items: ReactionItem[];
  selfReacted?: Set<ReactionEmoji>;
  onReact?: (emoji: ReactionEmoji) => void;
  onUnreact?: (emoji: ReactionEmoji) => void;
}

function BubbleReactions({ items, selfReacted = new Set(), onReact, onUnreact }: BubbleReactionsProps) {
  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-[var(--space-2xs)] mt-[var(--space-2xs)]">
      {items.map(({ emoji, count }) => {
        const isReacted = selfReacted.has(emoji);
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => (isReacted ? onUnreact?.(emoji) : onReact?.(emoji))}
            className={`inline-flex items-center gap-[2px] px-[var(--space-2xs)] py-[2px] rounded-[var(--radius-md)] text-[var(--font-size-caption)] transition-[background-color] duration-[var(--transition-hover)] focus-visible:outline-[2px] focus-visible:outline-[var(--color-accent-soft-ring)] focus-visible:outline-offset-[2px] ${
              isReacted
                ? 'bg-[var(--color-accent-soft-bg)]'
                : 'bg-transparent hover:bg-[var(--color-surface-2)]'
            }`}
          >
            <span>{emoji}</span>
            {count > 1 && <span className="font-[500] text-[var(--color-ink-muted)]">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export const Bubble = Object.assign(BubbleRoot, {
  Text: BubbleText,
  Image: BubbleImage,
  File: BubbleFile,
  ReplyTo: BubbleReplyTo,
  Reactions: BubbleReactions,
});
