import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useInfiniteMessages } from '@/hooks/useMessages';
import { useConversationRealtime } from '@/hooks/useConversationRealtime';
import { MessageItem } from './MessageItem';
import type { MessageListItem } from '@/lib/api/chat';

type Row =
  | { kind: 'date'; key: string; date: string }
  | {
      kind: 'msg';
      key: string;
      message: MessageListItem;
      isConsecutive: boolean;
    };

function DaySeparator({
  date,
  label,
}: {
  date: string;
  label: string;
}) {
  return (
    <div
      className="flex justify-center py-[var(--space-md)]"
      role="separator"
      data-day={date}
    >
      <span className="rounded-[var(--radius-pill)] bg-[var(--color-surface-2)] px-[var(--space-md)] py-[var(--space-2xs)] text-[var(--font-size-micro)] font-[500] text-[var(--color-ink-muted)]">
        {label}
      </span>
    </div>
  );
}

function dayLabel(date: string, t: (k: string) => string): string {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000)
    .toISOString()
    .slice(0, 10);
  if (date === today) return t('chat.today');
  if (date === yesterday) return t('chat.yesterday');
  return new Date(`${date}T00:00:00`).toLocaleDateString();
}

interface MessageListProps {
  conversationId: string;
}

/** Threshold below which two adjacent messages from the same sender
 *  render in "compact / consecutive" mode (avatar + sender name hidden). */
const CONSECUTIVE_WINDOW_MS = 5 * 60_000;

export function MessageList({ conversationId }: MessageListProps) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevScrollHeightRef = useRef<number>(0);
  const prevPageCountRef = useRef<number>(0);
  const lastReportedConvRef = useRef<string | null>(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteMessages(conversationId);

  // M3-5: subscribe per-conv Realtime (messages INSERT/UPDATE + reactions).
  // Patches the React Query messages cache in-place so the UI updates
  // without refetch. Cleanup fires on conversationId change / unmount.
  useConversationRealtime(conversationId);

  // Stick-to-bottom state — `true` while the user is "near" the bottom
  // of the scroll viewport. When a new Realtime-inserted or
  // optimistic-inserted (M3-4) message arrives AND this is true, we
  // scroll the virtualizer to the new last row. When the user scrolls
  // up to read history past the threshold, follow mode disengages so
  // reading isn't disturbed by incoming messages.
  const FOLLOW_THRESHOLD_PX = 200;
  const [followMode, setFollowMode] = useState(true);
  const prevLastItemIdRef = useRef<string | undefined>(undefined);

  // 1. Flatten pages + dedupe by id + sort ASC (chat-style top→bottom).
  const sortedItems = useMemo<MessageListItem[]>(() => {
    const pages = data?.pages ?? [];
    const seen = new Set<string>();
    const all: MessageListItem[] = [];
    for (const page of pages) {
      for (const m of page.items) {
        if (!seen.has(m.id)) {
          seen.add(m.id);
          all.push(m);
        }
      }
    }
    all.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return all;
  }, [data]);

  // 2. Inject day-separator rows + pre-compute isConsecutive.
  const virtualRows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    let prevDay: string | null = null;
    let prev: MessageListItem | null = null;
    for (const msg of sortedItems) {
      const day = msg.createdAt.slice(0, 10);
      if (day !== prevDay) {
        out.push({ kind: 'date', key: `date-${day}`, date: day });
        prevDay = day;
        prev = null;
      }
      const isConsecutive =
        prev !== null &&
        prev.senderId === msg.senderId &&
        Date.parse(msg.createdAt) - Date.parse(prev.createdAt) <
          CONSECUTIVE_WINDOW_MS;
      out.push({
        kind: 'msg',
        key: msg.id,
        message: msg,
        isConsecutive,
      });
      prev = msg;
    }
    return out;
  }, [sortedItems]);

  // 3. Virtualizer with dynamic measurement.
  const virtualizer = useVirtualizer({
    count: virtualRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 64,
    overscan: 8,
  });

  const vItems = virtualizer.getVirtualItems();

  // 4. Auto-scroll to bottom on conversation switch OR initial page arrive.
  //    Resets followMode to true on switch (auto-stick to bottom for the
  //    new room).
  useEffect(() => {
    if (!scrollRef.current) return;
    if (
      lastReportedConvRef.current !== conversationId &&
      sortedItems.length > 0
    ) {
      const el = scrollRef.current;
      el.scrollTop = el.scrollHeight;
      lastReportedConvRef.current = conversationId;
      prevPageCountRef.current = data?.pages.length ?? 1;
      prevScrollHeightRef.current = el.scrollHeight;
      // New room → re-engage follow mode regardless of prior scroll state.
      setFollowMode(true);
      prevLastItemIdRef.current =
        sortedItems[sortedItems.length - 1]?.id ?? undefined;
    }
  }, [conversationId, sortedItems.length, data?.pages.length]);

  // 5. Scroll-anchor preservation when older pages prepend.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const currentPages = data?.pages.length ?? 0;
    if (
      currentPages > prevPageCountRef.current &&
      prevPageCountRef.current > 0
    ) {
      const newHeight = el.scrollHeight;
      el.scrollTop += newHeight - prevScrollHeightRef.current;
      prevPageCountRef.current = currentPages;
      prevScrollHeightRef.current = newHeight;
    } else {
      prevScrollHeightRef.current = el.scrollHeight;
    }
  }, [data?.pages.length, sortedItems.length]);

  // 6. Infinite-scroll trigger (top) + follow-mode tracker (bottom).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      // load-more at top
      if (hasNextPage && !isFetchingNextPage && el.scrollTop <= 200) {
        void fetchNextPage();
      }
      // follow-mode toggle at bottom (within FOLLOW_THRESHOLD_PX of bottom).
      const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      setFollowMode(distFromBottom <= FOLLOW_THRESHOLD_PX);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // 7. M3-5: when a new last message id appears (Realtime INSERT OR
  //    optimistic INSERT from M3-4), if followMode is engaged → scroll
  //    virtualizer to the new tail.
  //
  //    Skips M3-4's optimistic `pending:<client_msg_id>` bubbles so the
  //    virtualizer isn't double-dragged on each send (pending → swap →
  //    Realtime echo). Only the canonical server-id scrollToIndex fires
  //    here; M3-4's onSuccess-enqueued scroll is sufficient (it also
  //    moves the virtualizer) and user UX remains smooth.
  const lastItemId = sortedItems[sortedItems.length - 1]?.id;
  const isPendingBubble = lastItemId
    ? lastItemId.startsWith('pending:')
    : false;
  useEffect(() => {
    if (!lastItemId) return;
    if (prevLastItemIdRef.current === undefined) {
      prevLastItemIdRef.current = lastItemId;
      return;
    }
    if (prevLastItemIdRef.current !== lastItemId) {
      prevLastItemIdRef.current = lastItemId;
      if (followMode && !isPendingBubble && virtualRows.length > 0) {
        // requestAnimationFrame lets the DOM settle before scrolling so
        // the virtualizer measures the new row correctly.
        requestAnimationFrame(() => {
          virtualizer.scrollToIndex(virtualRows.length - 1, { align: 'end' });
        });
      }
    }
  }, [lastItemId, followMode, isPendingBubble, virtualRows.length, virtualizer]);

  // Render-states
  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-[var(--space-md)] text-[var(--color-ink-muted)]">
        {t('common.loading')}
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center p-[var(--space-md)] text-[var(--color-status-error)]">
        {t('chat.error')}
      </div>
    );
  }
  if (sortedItems.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-[var(--space-md)] text-[var(--color-ink-muted)]">
        {t('chat.noMessages')}
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="relative min-h-0 flex-1 overflow-y-auto"
      role="log"
      aria-live="polite"
      aria-busy={isFetchingNextPage || undefined}
    >
      {/* Top-of-list load-more indicator */}
      <div className="sticky top-0 z-10 flex items-center justify-center bg-[var(--color-canvas-default)]/80 py-[var(--space-xs)] backdrop-blur-sm">
        <span className="text-[var(--font-size-micro)] text-[var(--color-ink-muted)]">
          {isFetchingNextPage
            ? t('messages.loadingMore')
            : hasNextPage
              ? t('messages.loadMore')
              : t('messages.noMore')}
        </span>
      </div>

      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative',
          width: '100%',
        }}
      >
        {vItems.map((virtualRow) => {
          const row = virtualRows[virtualRow.index];
          if (!row) return null;
          return (
            <div
              key={row.key}
              data-index={virtualRow.index}
              ref={(el) => {
                if (el) {
                  virtualizer.measureElement(el);
                }
              }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {row.kind === 'date' ? (
                <DaySeparator date={row.date} label={dayLabel(row.date, t)} />
              ) : (
                <MessageItem item={row.message} isConsecutive={row.isConsecutive} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
