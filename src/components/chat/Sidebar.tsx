import { useTranslation } from 'react-i18next';
import { useConversationsQuery } from '@/hooks/useConversations';
import { useUI } from '@/stores/useUI';
import { useAuth } from '@/stores/useAuth';
import { Avatar } from '@/components/ui/Avatar';
import { ConversationListItemRow } from './ConversationListItem';

/**
 * Skeleton row used while the conversations query is in flight.
 * Two rows avoid layout shift on first paint without looking busy.
 */
function SkeletonRow() {
  return (
    <div
      aria-hidden="true"
      className="w-full flex items-center gap-[var(--space-md)] px-[var(--space-md)] py-[var(--space-sm)]"
    >
      <div className="w-[32px] h-[32px] rounded-[var(--radius-circle)] bg-[var(--color-surface-2)]" />
      <div className="flex-1 min-w-0">
        <div className="h-[14px] w-2/3 rounded-[var(--radius-sm)] bg-[var(--color-surface-2)] mb-[6px]" />
        <div className="h-[10px] w-1/2 rounded-[var(--radius-sm)] bg-[var(--color-surface-2)]" />
      </div>
    </div>
  );
}

function EmptyState() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center text-center px-[var(--space-lg)] py-[var(--space-xl)] h-full">
      <div className="text-[var(--color-ink-muted)] text-[var(--font-size-body)] font-[500] mb-[var(--space-xs)]">
        {t('sidebar.empty')}
      </div>
      <p className="text-[var(--font-size-meta)] text-[var(--color-ink-muted)] leading-relaxed max-w-[28ch]">
        {t('sidebar.emptyHint')}
      </p>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center text-center px-[var(--space-lg)] py-[var(--space-xl)] gap-[var(--space-sm)]">
      <span className="text-[var(--color-status-error)] text-[var(--font-size-body)] font-[500]">
        {t('sidebar.error')}
      </span>
      <button
        type="button"
        onClick={onRetry}
        className="text-[var(--color-accent-default)] hover:underline text-[var(--font-size-meta)] font-[500]"
      >
        {t('sidebar.retry')}
      </button>
    </div>
  );
}

export function Sidebar() {
  const { t } = useTranslation();
  const { data, isLoading, error, refetch, isFetching } =
    useConversationsQuery();
  const selectedId = useUI((s) => s.selectedConversationId);
  const setSelected = useUI((s) => s.setSelectedConversation);
  const profile = useAuth((s) => s.profile);

  const showSkeleton = isLoading && !data;
  const showError = Boolean(error) && !data;
  const items = data ?? [];
  const showEmpty = !showSkeleton && !showError && items.length === 0;

  return (
    <aside
      className="flex flex-col h-full w-[var(--sidebar-width)] border-r border-[var(--color-hairline-default)] bg-[var(--color-canvas-soft)] flex-shrink-0"
      aria-label={t('sidebar.title')}
    >
      {/* Header: app brand + current user avatar */}
      <header className="flex items-center justify-between gap-[var(--space-sm)] px-[var(--space-md)] py-[var(--space-md)] border-b border-[var(--color-hairline-default)]">
        <h1 className="text-[var(--font-size-h3)] font-[600] text-[var(--color-ink-default)] tracking-tight">
          {t('app.name')}
        </h1>
        <button
          type="button"
          aria-label={t('nav.profile')}
          className="rounded-[var(--radius-circle)] hover:bg-[var(--color-surface-2)] p-[2px] transition-colors duration-[var(--duration-fast)]"
        >
          <Avatar
            size="sm"
            src={profile?.avatarUrl ?? null}
            name={profile?.displayName ?? ''}
            initials={(profile?.displayName ?? '·')[0] ?? '·'}
          />
        </button>
      </header>

      {/* Conversation list (scrolls independently) */}
      <div
        className="flex-1 min-h-0 overflow-y-auto"
        role="list"
        aria-busy={isFetching || undefined}
      >
        {showSkeleton && (
          <div className="divide-y divide-[var(--color-hairline-default)]" aria-hidden="true">
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        )}

        {showError && <ErrorState onRetry={() => void refetch()} />}

        {showEmpty && <EmptyState />}

        {items.length > 0 && (
          <ul className="divide-y divide-[var(--color-hairline-default)] m-0 p-0 list-none">
            {items.map((c) => (
              <li key={c.id} role="listitem">
                <ConversationListItemRow
                  item={c}
                  selected={c.id === selectedId}
                  onSelect={setSelected}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
