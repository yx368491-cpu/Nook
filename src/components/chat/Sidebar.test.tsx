/**
 * Nook M9-discoverability · Sidebar footer tests.
 *
 * Coverage strategy:
 *   - admin gate: "Invite friend" link is only rendered when
 *     `profile.role === 'owner'` (useIsOwner).
 *   - footer presence: the persistent footer renders for any auth state
 *     (the avatar in the header covers the Settings path; the footer
 *     gives a one-tap explicit surface for the same destination).
 *
 * Mocks:
 *   - useConversationsQuery → empty list (we only assert footer, not list).
 *   - useAuth → selector-driven (`sel(s) → s.session, s.profile`) so the
 *     same mock wrapper covers the admin-gate scenarios above.
 *   - useUI → selector-driven for `selectedConversationId`.
 *
 * Important: the existing chat-core integration tests already mount Sidebar
 * with `profile.role === 'owner'` (see chat-core-send, lifecycle, isolation,
 * reply-reactions, errors). Adding the Invite link to those test renders
 * does not break those tests because they don't query for its absence,
 * but the test counts there will tick up so the new affordance is part of
 * the rendered-by-default surface that the integration suite covers.
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import i18n from '@/lib/i18n';

vi.mock('@/hooks/useConversations', () => ({
  useConversationsQuery: vi.fn(),
}));

vi.mock('@/stores/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/stores/useUI', () => ({
  useUI: vi.fn(),
}));

import { useConversationsQuery } from '@/hooks/useConversations';
import { useAuth } from '@/stores/useAuth';
import { useUI } from '@/stores/useUI';
import { Sidebar } from './Sidebar';

const useConversationsQueryMock = useConversationsQuery as unknown as Mock;
const useAuthMock = useAuth as unknown as Mock;
const useUIMock = useUI as unknown as Mock;

function renderSidebar() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  // MemoryRouter is required: <FooterActions> mounts <Link to="/invite/new">
  // and <Link to="/settings"> from react-router-dom, which throws an
  // invariant ("useHref() may be used only in the context of a <Router>")
  // when no Router context is present. initialEntries sets a sane
  // starting location; the test never navigates.
  return render(
    <MemoryRouter initialEntries={['/']}>
      <QueryClientProvider client={qc}>
        <I18nextProvider i18n={i18n}>
          <Sidebar />
        </I18nextProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

beforeEach(async () => {
  vi.clearAllMocks();
  await i18n.changeLanguage('en');
  // Default: empty conversation list, no selection, owner auth state.
  // Each test can override `useAuthMock` to flip role / null profile.
  useConversationsQueryMock.mockReturnValue({
    data: [] as Array<unknown>,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    isFetching: false,
  });
  useUIMock.mockImplementation(
    (sel: (s: { selectedConversationId: string | null; setSelectedConversation: (id: string) => void }) => unknown) =>
      sel({ selectedConversationId: null, setSelectedConversation: vi.fn() }),
  );
  useAuthMock.mockImplementation(
    (sel: (s: { session: { user: { id: string; email?: string } } | null; profile: { id: string; role: 'owner' | 'friend'; displayName: string; avatarUrl: string | null } | null }) => unknown) =>
      sel({
        session: { user: { id: 'owner-uuid', email: 'p@x.com' } },
        profile: {
          id: 'owner-uuid',
          role: 'owner',
          displayName: 'Probe',
          avatarUrl: null,
        },
      }),
  );
});

// ---------------------------------------------------------------------------
// Footer presence + admin gate on "Invite friend"
// ---------------------------------------------------------------------------

describe('Sidebar — footer affordances', () => {
  it('owner profile → renders both Invite friend + Settings footer links', () => {
    renderSidebar();
    expect(screen.getByTestId('sidebar-footer')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-footer-invite')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-footer-settings')).toBeInTheDocument();
  });

  it('friend (non-owner) profile → hides Invite friend, keeps Settings link', () => {
    useAuthMock.mockImplementation(
      (sel: (s: { session: { user: { id: string; email?: string } } | null; profile: { id: string; role: 'owner' | 'friend'; displayName: string; avatarUrl: string | null } | null }) => unknown) =>
        sel({
          session: { user: { id: 'friend-uuid', email: 'p@x.com' } },
          profile: {
            id: 'friend-uuid',
            role: 'friend',
            displayName: 'Probe',
            avatarUrl: null,
          },
        }),
    );
    renderSidebar();
    expect(screen.getByTestId('sidebar-footer')).toBeInTheDocument();
    expect(screen.queryByTestId('sidebar-footer-invite')).toBeNull();
    expect(screen.getByTestId('sidebar-footer-settings')).toBeInTheDocument();
  });

  it('unauthenticated session → renders footer WITHOUT either affordance', () => {
    // Defensive: even though /  is gated by RequireAuth, the Sidebar
    // component itself must not flash interactive "Sign out" / "Invite"
    // affordances before the auth gate redirects away.
    useAuthMock.mockImplementation(
      (sel: (s: { session: { user: { id: string; email?: string } } | null; profile: { id: string; role: 'owner' | 'friend'; displayName: string; avatarUrl: string | null } | null }) => unknown) =>
        sel({ session: null, profile: null }),
    );
    renderSidebar();
    expect(screen.queryByTestId('sidebar-footer-invite')).toBeNull();
    expect(screen.queryByTestId('sidebar-footer-settings')).toBeNull();
  });

  it('owner Invite link points to /invite/new', () => {
    renderSidebar();
    const invite = screen.getByTestId('sidebar-footer-invite');
    expect(invite.getAttribute('href')).toBe('/invite/new');
  });

  it('Settings link points to /settings', () => {
    renderSidebar();
    const settings = screen.getByTestId('sidebar-footer-settings');
    expect(settings.getAttribute('href')).toBe('/settings');
  });
});
