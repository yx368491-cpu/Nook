import { useTranslation } from 'react-i18next';

export default function HomePage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex bg-[var(--color-canvas-default)]">
      {/* Sidebar placeholder */}
      <aside className="w-[var(--sidebar-width)] border-r border-[var(--color-hairline-default)] bg-[var(--color-canvas-soft)]">
        <div className="p-[var(--space-md)]">
          <h2 className="text-[var(--font-size-h3)] font-[600] text-[var(--color-ink-default)]">{t('app.name')}</h2>
        </div>
      </aside>

      {/* Chat area placeholder */}
      <main className="flex-1 flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[var(--font-size-body)] text-[var(--color-ink-muted)]">
            {t('chat.emptyConversation')}
          </p>
        </div>
      </main>
    </div>
  );
}
