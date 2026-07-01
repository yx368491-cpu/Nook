import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useConversationsQuery } from '@/hooks/useConversations';
import { useUI } from '@/stores/useUI';
import { useAuth } from '@/stores/useAuth';
import { useIsOwner } from '@/lib/auth/guards';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
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
      <Skeleton width={32} height={32} variant="circle" />
      <div className="flex-1 min-w-0 flex flex-col gap-[6px]">
        <Skeleton width="66%" height={14} variant="text" />
        <Skeleton width="50%" height={10} variant="text" />
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
        className={[
          'text-[var(--color-accent-default)] text-[var(--font-size-meta)] font-[500]',
          'hover:underline',
          'focus-visible:outline-[2px] focus-visible:outline-[var(--color-accent-soft-ring)] focus-visible:outline-offset-[2px]',
        ].join(' ')}
      >
        {t('sidebar.retry')}
      </button>
    </div>
  );
}

/**
 * Persistent footer item.
 *
 * Two-link footer (admin-gated "Invite friend" + "Settings") gives one-click
 * access to the highest-value actions from any chat view without forcing the
 * user to discover the deep-link paths (/invite/new lives behind
 * /settings/admin and the avatar in the header is not obviously clickable).
 *
 * Intentional redundancy: the footer "Settings" link duplicates the header
 * avatar's `<Link to="/settings">`. The avatar is a thin visual atom and
 * users routinely don't realise it's tappable; an explicit text affordance
 * wins on discoverability. Don't deduplicate without revisiting the
 * UX-discoverability cost.
 *
 * The "Invite friend" link is gated on `useIsOwner()` so non-admin profiles
 * never see an entry-point they couldn't actually act on. The Server-side
 * admin-create-invite EF re-checks `profile.role === 'owner'` so this is a
 * UX nicety, not a security boundary.
 *
 * a11y: visible text is the link name; we deliberately do NOT add an
 * `aria-label` because that would double-announce for screen readers, and
 * we skip `title=` because hover already shows the link text.
 */
function FooterActions() {
  const { t } = useTranslation();
  const isOwner = useIsOwner();
  const isAuthed = useAuth((s) => s.session !== null);

  return (
    <footer
      className="
        flex flex-col gap-[var(--space-xs)]
        px-[var(--space-md)] py-[var(--space-md)]
        border-t border-[var(--color-hairline-default)]
        bg-[var(--color-canvas-soft)]
      "
      aria-label={t('sidebar.footerLabel')}
      data-testid="sidebar-footer"
    >
      {isAuthed && (
        <>
          {isOwner && (
            <Link
              to="/invite/new"
              data-testid="sidebar-footer-invite"
              className="
                flex items-center gap-[var(--space-sm)]
                min-h-[40px] px-[var(--space-sm)] py-[var(--space-2xs)]
                rounded-[var(--radius-md)]
                text-[var(--font-size-meta)] font-[500]
                text-[var(--color-accent-default)]
                hover:bg-[var(--color-surface-2)]
                transition-colors duration-[var(--duration-fast)]
                focus-visible:outline-[2px] focus-visible:outline-[var(--color-accent-soft-ring)] focus-visible:outline-offset-[2px]
              "
            >
              <span aria-hidden="true" className="text-[var(--font-size-body)]">+</span>
              <span>{t('sidebar.inviteFriend')}</span>
            </Link>
          )}
          <Link
            to="/settings"
            data-testid="sidebar-footer-settings"
            className="
              flex items-center gap-[var(--space-sm)]
              min-h-[40px] px-[var(--space-sm)] py-[var(--space-2xs)]
              rounded-[var(--radius-md)]
              text-[var(--font-size-meta)]
              text-[var(--color-ink-default)]
              hover:bg-[var(--color-surface-2)]
              transition-colors duration-[var(--duration-fast)]
              focus-visible:outline-[2px] focus-visible:outline-[var(--color-accent-soft-ring)] focus-visible:outline-offset-[2px]
            "
          >
            <span aria-hidden="true">⚙</span>
            <span>{t('sidebar.settings')}</span>
          </Link>
        </>
      )}
    </footer>
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
        <Link
          to="/settings"
          aria-label={t('nav.profile')}
          className={[
            'rounded-[var(--radius-circle)]',
            'p-[2px]',
            'min-w-[44px] min-h-[44px]',
            'flex items-center justify-center',
            'hover:bg-[var(--color-surface-2)]',
            'transition-colors duration-[var(--duration-fast)]',
            'focus-visible:outline-[2px] focus-visible:outline-[var(--color-accent-soft-ring)] focus-visible:outline-offset-[2px]',
          ].join(' ')}
          data-testid="sidebar-profile-link"
        >
          <Avatar
            size="sm"
            src={profile?.avatarUrl ?? null}
            name={profile?.displayName ?? ''}
            initials={(profile?.displayName ?? '·')[0] ?? '·'}
          />
        </Link>
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

      {/* Persistent footer — Invite friend (admin-only) + Settings */}
      <FooterActions />
    </aside>
  );
}
