import { useTranslation } from 'react-i18next';
import { Sidebar } from '@/components/chat/Sidebar';

/**
 * HomePage — authenticated chat surface.
 *
 * For M3-2 we render:
 *   - Sidebar (1:1 + group list, sorted by latest activity)
 *   - Empty center pane hint "Send the first message" while no
 *     conversation is selected (will be replaced by M3-3 ChatPanel).
 *
 * Layout uses fixed sidebar width (`--sidebar-width` token) and flex-1
 * for the centre, matching the design tokens layout in
 * `04_Runtime/Nook-DESIGN-TOKENS.css`.
 */
export default function HomePage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex bg-[var(--color-canvas-default)]">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[var(--font-size-body)] text-[var(--color-ink-muted)]">
            {t('chat.emptyConversation')}
          </p>
        </div>
      </main>
    </div>
  );
}
