import { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { adminApi, type CreatedInvite } from '@/lib/api/admin';
import { useConversationsQuery } from '@/hooks/useConversations';
import type { InviteTargetKind } from '@/lib/admin/invite';

/**
 * Nook M6 · /invite/new (F-AUTH-03/04/07).
 *
 * UI flow:
 * 1. Owner lands on /invite/new (RequireAuth → RequireAdmin).
 * 2. Pick invite target — "New 1:1 chat" (any) or "Add to existing conversation".
 * 3. If conversation: pick from a select listing owner-created convs.
 * 4. Click "Create link" → adminApi.createInvite() → invalidates nothing
 *    (this is a one-shot wizard), but DOES route the response to result UI.
 * 5. Result card shows the public/URL, copy button, expires-at timestamp.
 *
 * Out of scope for M6-3: TTL selector (always 24h for v1.0 — param is wired
 * in adminApi.createInvite but not exposed in UI yet), retry on failure,
 * automatic revoke of the just-used token.
 */

const COPY_FEEDBACK_MS = 2000;

function decodeErrorMessage(err: unknown, t: (k: string) => string): string {
  const code =
    err && typeof err === 'object' && 'code' in err
      ? (err as { code: string }).code
      : null;
  switch (code) {
    case 'E_AUTH_UNAUTHORIZED':
      return t('settings.inviteNew.error.unauthorized');
    case 'E_AUTH_FORBIDDEN':
      return t('settings.inviteNew.error.forbidden');
    case 'E_RES_NOT_FOUND':
      return t('settings.inviteNew.error.conversationNotOwned');
    case 'E_VAL_REQUIRED_FIELD':
    case 'E_VAL_INVALID_FORMAT':
      return t('settings.inviteNew.error.invalidInput');
    case 'INTERNAL':
    case 'E_SYS_INTERNAL':
      return t('settings.inviteNew.error.internal');
    default:
      return t('settings.inviteNew.error.generic');
  }
}

export default function InviteNewPage() {
  const { t } = useTranslation();
  const conversations = useConversationsQuery();

  // Form state — single-key wizard, useState is sufficient.
  const [targetKind, setTargetKind] = useState<InviteTargetKind>('any');
  const [selectedConversationId, setSelectedConversationId] = useState<string>('');

  // Reset conversation selection when target switches to 'any'.
  useEffect(() => {
    if (targetKind === 'any') setSelectedConversationId('');
  }, [targetKind]);

  // Auto-pick the first conversation when (a) targetKind becomes 'conversation'
  // AND (b) there's exactly one choice and (c) the user hasn't picked yet.
  const ownedConvs = useMemo(
    () => (conversations.data ?? []).filter((c) => c.kind === 'group' || c.kind === 'one_to_one'),
    [conversations.data],
  );

  // Set initial focus on the "Create link" button on first paint.
  const createButtonRef = useRef<HTMLButtonElement | null>(null);
  // Copy-feedback state — show "Copied!" for COPY_FEEDBACK_MS.
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<number | null>(null);
  useEffect(() => () => {
    if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current);
  }, []);

  const mutation = useMutation<CreatedInvite, unknown, void>({
    mutationFn: () => {
      if (targetKind === 'conversation' && !selectedConversationId) {
        throw { code: 'E_VAL_REQUIRED_FIELD', message: 'target_conversation_id required' };
      }
      return adminApi.createInvite({
        targetKind,
        targetConversationId:
          targetKind === 'conversation' ? selectedConversationId : undefined,
      });
    },
  });

  const handleCreate = () => {
    setCopied(false);
    mutation.mutate();
  };

  const handleCopy = async () => {
    const url = mutation.data?.invite_url;
    if (!url) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        // Fallback: select via temp textarea + execCommand.
        const ta = document.createElement('textarea');
        ta.value = url;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = window.setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
    } catch {
      setCopied(false);
    }
  };

  const handleReset = () => {
    mutation.reset();
    setCopied(false);
  };

  // ───────────────────────────────────────────────────────────────
  // Render: success state (after successful mutation)
  // ───────────────────────────────────────────────────────────────
  if (mutation.isSuccess && mutation.data) {
    const data = mutation.data;
    const convTitle = selectedConversationId
      ? ownedConvs.find((c) => c.id === selectedConversationId)?.title ?? '—'
      : null;
    const targetSummary =
      data.target_kind === 'any'
        ? t('settings.inviteNew.created.targetAny')
        : t('settings.inviteNew.created.targetConversation', { name: convTitle ?? '—' });

    return (
      <main
        className="min-h-screen bg-[var(--color-canvas-default)] p-[var(--space-xl)]"
        data-testid="invite-new-success"
      >
        <div className="mx-auto max-w-[560px] flex flex-col gap-[var(--space-xl)]">
          <h1 className="text-[var(--font-size-h2)] font-[600] text-[var(--color-ink-default)]">
            {t('settings.inviteNew.created.title')}
          </h1>

          {/* Invite URL card */}
          <div className="flex flex-col gap-[var(--space-md)] rounded-[var(--radius-xl)] border border-[var(--color-hairline-strong)] bg-[var(--color-surface-1)] p-[var(--space-lg)] shadow-[var(--shadow-2)]">
            <label
              htmlFor="invite-url-readonly"
              className="text-[var(--font-size-caption)] text-[var(--color-ink-muted)]"
            >
              {t('settings.inviteNew.created.inviteUrlLabel')}
            </label>
            <div className="flex gap-[var(--space-xs)]">
              <input
                id="invite-url-readonly"
                type="text"
                readOnly
                value={data.invite_url}
                data-testid="invite-new-url"
                onFocus={(e) => e.currentTarget.select()}
                className="flex-1 round-[var(--radius-md)] border border-[var(--color-hairline-default)] bg-[var(--color-canvas-default)] px-[var(--space-md)] py-[var(--space-sm)] text-[var(--font-size-meta)] text-[var(--color-ink-default)] outline-none focus:border-[var(--color-accent-soft-ring)]"
                style={{ borderRadius: 'var(--radius-md)' }}
              />
              <Button
                intent="accent"
                size="md"
                onClick={handleCopy}
                data-testid="invite-new-copy"
              >
                {copied
                  ? t('settings.inviteNew.created.copied')
                  : t('settings.inviteNew.created.copyButton')}
              </Button>
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-[var(--space-xs)] pt-[var(--space-sm)] border-t border-[var(--color-hairline-default)]">
              <div className="flex flex-col gap-[var(--space-2xs)]">
                <dt className="text-[var(--font-size-caption)] text-[var(--color-ink-muted)]">
                  {t('settings.inviteNew.created.expiresAtLabel')}
                </dt>
                <dd className="text-[var(--font-size-meta)] text-[var(--color-ink-default)]">
                  {new Date(data.expires_at).toLocaleString()}
                </dd>
              </div>
              <div className="flex flex-col gap-[var(--space-2xs)]">
                <dt className="text-[var(--font-size-caption)] text-[var(--color-ink-muted)]">
                  {t('settings.inviteNew.created.targetSummary')}
                </dt>
                <dd className="text-[var(--font-size-meta)] text-[var(--color-ink-default)]">
                  {targetSummary}
                </dd>
              </div>
            </dl>
          </div>

          {/* Back link */}
          <div className="flex gap-[var(--space-sm)]">
            <Link to="/settings/admin">
              <Button intent="neutral" size="md" data-testid="invite-new-done">
                {t('settings.inviteNew.created.done')}
              </Button>
            </Link>
            <Button
              intent="neutral"
              size="md"
              onClick={handleReset}
              data-testid="invite-new-create-another"
            >
              {t('settings.inviteNew.create')}
            </Button>
          </div>
        </div>
      </main>
    );
  }

  // ───────────────────────────────────────────────────────────────
  // Render: form state (default + error)
  // ───────────────────────────────────────────────────────────────
  const isCreating = mutation.isPending;
  const errorMessage = mutation.isError ? decodeErrorMessage(mutation.error, t) : null;
  const canSubmit =
    !isCreating &&
    (targetKind === 'any' || (targetKind === 'conversation' && selectedConversationId));

  return (      <main
        className="min-h-screen bg-[var(--color-canvas-default)] p-[var(--space-xl)]"
        data-testid="invite-new-form"
      >
        <div className="mx-auto max-w-[560px] flex flex-col gap-[var(--space-xl)]">
        {/* Header */}
        <div className="flex flex-col gap-[var(--space-xs)]">
          <h1 className="text-[var(--font-size-h2)] font-[600] text-[var(--color-ink-default)]">
            {t('settings.inviteNew.title')}
          </h1>
          <p className="text-[var(--font-size-meta)] text-[var(--color-ink-muted)] leading-[var(--leading-chill)]">
            {t('settings.inviteNew.subtitle')}
          </p>
        </div>

        {/* Form card */}
        <form
          className="flex flex-col gap-[var(--space-lg)] rounded-[var(--radius-xl)] border border-[var(--color-hairline-default)] bg-[var(--color-surface-1)] p-[var(--space-lg)] shadow-[var(--shadow-2)]"
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) handleCreate();
          }}
        >
          {/* Target kind radios */}
          <fieldset className="flex flex-col gap-[var(--space-md)]">
            <legend className="text-[var(--font-size-body)] font-[600] text-[var(--color-ink-default)] mb-[var(--space-2xs)]">
              {t('settings.inviteNew.targetKindLabel')}
            </legend>

            <label
              className="
                flex gap-[var(--space-sm)] cursor-pointer
                rounded-[var(--radius-md)] border border-[var(--color-hairline-default)]
                p-[var(--space-md)]
                transition-colors duration-[var(--transition-hover)]
                hover:bg-[var(--color-surface-2)]
                has-[input:checked]:border-[var(--color-accent-soft-ring)]
                has-[input:checked]:bg-[var(--color-accent-soft-bg)]
              "
              data-testid="invite-new-radio-any"
            >
              <input
                type="radio"
                name="target-kind"
                value="any"
                checked={targetKind === 'any'}
                onChange={() => setTargetKind('any')}
                className="mt-[4px] accent-[var(--color-accent-default)]"
              />
              <span className="flex flex-col gap-[var(--space-2xs)]">
                <span className="text-[var(--font-size-body)] font-[500] text-[var(--color-ink-default)]">
                  {t('settings.inviteNew.targetKindAny')}
                </span>
                <span className="text-[var(--font-size-meta)] text-[var(--color-ink-muted)] leading-[var(--leading-chill)]">
                  {t('settings.inviteNew.targetKindAnyHint')}
                </span>
              </span>
            </label>

            <label
              className="
                flex gap-[var(--space-sm)] cursor-pointer
                rounded-[var(--radius-md)] border border-[var(--color-hairline-default)]
                p-[var(--space-md)]
                transition-colors duration-[var(--transition-hover)]
                hover:bg-[var(--color-surface-2)]
                has-[input:checked]:border-[var(--color-accent-soft-ring)]
                has-[input:checked]:bg-[var(--color-accent-soft-bg)]
              "
              data-testid="invite-new-radio-conversation"
            >
              <input
                type="radio"
                name="target-kind"
                value="conversation"
                checked={targetKind === 'conversation'}
                onChange={() => setTargetKind('conversation')}
                className="mt-[4px] accent-[var(--color-accent-default)]"
              />
              <span className="flex flex-col gap-[var(--space-2xs)]">
                <span className="text-[var(--font-size-body)] font-[500] text-[var(--color-ink-default)]">
                  {t('settings.inviteNew.targetKindConversation')}
                </span>
                <span className="text-[var(--font-size-meta)] text-[var(--color-ink-muted)] leading-[var(--leading-chill)]">
                  {t('settings.inviteNew.targetKindConversationHint')}
                </span>
              </span>
            </label>
          </fieldset>

          {/* Conversation picker (only when target = conversation) */}
          {targetKind === 'conversation' && (
            <div className="flex flex-col gap-[var(--space-xs)]">
              <label
                htmlFor="invite-new-conv-select"
                className="text-[var(--font-size-body)] font-[500] text-[var(--color-ink-default)]"
              >
                {t('settings.inviteNew.selectConversationLabel')}
              </label>
              <select
                id="invite-new-conv-select"
                data-testid="invite-new-conv-select"
                value={selectedConversationId}
                onChange={(e) => setSelectedConversationId(e.target.value)}
                className="
                  h-[var(--size-input-md)]
                  rounded-[var(--radius-md)]
                  border border-[var(--color-hairline-default)]
                  bg-[var(--color-canvas-default)]
                  px-[var(--space-md)]
                  text-[var(--font-size-body)] text-[var(--color-ink-default)]
                  outline-none focus:border-[var(--color-accent-soft-ring)]
                  transition-colors duration-[var(--transition-hover)]
                "
                disabled={conversations.isLoading}
              >
                <option value="" disabled>
                  {t('settings.inviteNew.selectConversationPlaceholder')}
                </option>
                {(conversations.data ?? ownedConvs).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title ?? t('chat.noMessages')}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Error strip */}
          {errorMessage && (
            <p
              role="alert"
              aria-live="polite"
              data-testid="invite-new-error"
              className="
                rounded-[var(--radius-md)] border border-[var(--color-signal-error)]/40
                bg-[var(--color-signal-error-soft)]
                px-[var(--space-md)] py-[var(--space-sm)]
                text-[var(--font-size-meta)] text-[var(--color-signal-error)]
              "
            >
              {errorMessage}
            </p>
          )}

          {/* Submit */}
          <Button
            ref={createButtonRef}
            intent="accent"
            size="md"
            type="submit"
            disabled={!canSubmit}
            loading={isCreating}
            data-testid="invite-new-submit"
            className="self-start"
          >
            {isCreating
              ? t('settings.inviteNew.creating')
              : t('settings.inviteNew.create')}
          </Button>
        </form>
      </div>
    </main>
  );
}
