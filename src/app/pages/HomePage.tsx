import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Sidebar } from '@/components/chat/Sidebar';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { useUI } from '@/stores/useUI';
import { useConversationsQuery } from '@/hooks/useConversations';
import { useUserRealtime } from '@/hooks/useUserRealtime';
import { useIsDesktop } from '@/hooks/useMediaQuery';

/**
 * M7-4 Responsive layout (F-UI-01 / NF-RESP-N01).
 *
 * Layout modes:
 *   Desktop (≥1024px):
 *     [ Sidebar inline ]  [ ChatPanel | empty-state hint ]
 *   Tablet / Mobile (<1024px):
 *     [ ChatPanel ]  — Sidebar slides in as overlay drawer
 *
 * On mobile/tablet the sidebar is rendered as a fixed-position drawer
 * with a scrim backdrop. The ChatPanel header shows a hamburger button
 * to toggle it open.
 */
export default function HomePage() {
  const { t } = useTranslation();
  const selectedId = useUI((s) => s.selectedConversationId);
  const sidebarOpen = useUI((s) => s.sidebarOpen);
  const setSidebarOpen = useUI((s) => s.setSidebarOpen);
  const { data: conversations } = useConversationsQuery();
  const selected = conversations?.find((c) => c.id === selectedId);
  const isDesktop = useIsDesktop();

  // M3-5: subscribe user-global Realtime
  useUserRealtime();

  // Refs to manage `inert` on drawer + scrim when closed (prevents Tab
  // focus into invisible sidebar elements on mobile/tablet).
  const drawerRef = useRef<HTMLElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    [drawerRef.current, scrimRef.current].forEach((el) => {
      if (!el) return;
      if (sidebarOpen) {
        el.removeAttribute('inert');
      } else {
        el.setAttribute('inert', '');
      }
    });
  }, [sidebarOpen, isDesktop]);

  return (
    <div className="flex min-h-screen bg-[var(--color-canvas-default)]">
      {/* ── Desktop: sidebar inline ──────────────────────────── */}
      {isDesktop && <Sidebar />}

      {/* ── Mobile/Tablet: sidebar drawer overlay ────────────── */}
      {!isDesktop && (
        <>
          {/* Scrim backdrop — fades in/out with the drawer */}
          <div
            ref={scrimRef}
            className={[
              'fixed inset-0 z-[var(--z-overlay)]',
              'bg-[var(--color-overlay-drawer-back)]',
              'transition-opacity duration-[var(--duration-base)]',
              sidebarOpen
                ? 'opacity-100 pointer-events-auto'
                : 'opacity-0 pointer-events-none',
            ].join(' ')}
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
            data-testid="sidebar-scrim"
          />

          {/* Drawer panel — slides in from left */}
          <aside
            ref={drawerRef}
            className={[
              'fixed left-0 top-0 h-full z-[calc(var(--z-overlay)+1)]',
              'bg-[var(--color-canvas-soft)]',
              'border-r border-[var(--color-hairline-default)]',
              'shadow-[var(--shadow-3)]',
              'transition-transform duration-[var(--duration-base)]',
              // Mobile: full viewport width up to sidebar-width;
              // Tablet: fixed sidebar-width
              'w-screen max-w-[var(--sidebar-width)]',
              sidebarOpen ? 'translate-x-0' : '-translate-x-full',
            ].join(' ')}
            aria-label={t('sidebar.title')}
            data-testid="sidebar-drawer"
          >
            <Sidebar />
          </aside>
        </>
      )}

      {/* ── Main content ────────────────────────────────────── */}
      <main className="flex min-w-0 flex-1 flex-col">
        {!selectedId ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-[var(--space-sm)] p-[var(--space-md)] text-center">
            <p className="text-[var(--font-size-body)] font-[500] text-[var(--color-ink-muted)]" role="status">
              {t('chat.emptyConversation')}
            </p>
            <p className="text-[var(--font-size-meta)] text-[var(--color-ink-subtle)] max-w-[32ch] leading-[var(--leading-chill)]">
              {t('sidebar.emptyHint')}
            </p>
          </div>
        ) : selected ? (
          <ChatPanel
            conversationId={selectedId}
            title={selected.title}
            avatarUrl={selected.avatarUrl}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center p-[var(--space-md)]">
            <p className="text-[var(--font-size-meta)] text-[var(--color-ink-muted)]" role="status">
              {t('common.loading')}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
