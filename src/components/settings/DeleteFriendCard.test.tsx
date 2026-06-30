/**
 * Nook M6-5 · DeleteFriendCard component tests.
 *
 * Coverage strategy: state-machine walk + i18n key wiring + critical
 * UX gates (button disabled until friend picked, modal phrase gate,
 * success card rendering, error strip surfacing, picker refresh on
 * success).
 *
 * Mocks:
 *   - adminApi.deleteFriend — set per-test via vi.mock of
 *     '@/lib/api/admin' (auto-mocked; the wrapper exports are
 *     overridden individually).
 *   - useFriendsQuery — replaced directly via mockReturnValue so we
 *     control the picker data without supabase mocks.
 *   - useAuth — controlled via selector-mock wrapper.
 *   - useDeleteFriend cache invalidation — verified via qc spy on
 *     invalidateQueries.
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import type { ReactNode } from 'react';
import i18n from '@/lib/i18n';

vi.mock('@/lib/api/admin', () => ({
  adminApi: {
    deleteFriend: vi.fn(),
  },
}));

vi.mock('@/hooks/useFriendsQuery', () => ({
  useFriendsQuery: vi.fn(),
}));

vi.mock('@/stores/useAuth', () => ({
  useAuth: vi.fn(),
}));

import { adminApi } from '@/lib/api/admin';
import { useFriendsQuery } from '@/hooks/useFriendsQuery';
import { useAuth } from '@/stores/useAuth';
import { DeleteFriendCard } from './DeleteFriendCard';

const useFriendsQueryMock = useFriendsQuery as unknown as Mock;
const useAuthMock = useAuth as unknown as Mock;
const deleteFriendMock = adminApi.deleteFriend as unknown as Mock;

function renderCard() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');
  return {
    invalidateSpy,
    rerender: () => undefined, // no-op, kept symmetric with M6-4 fixture
    view: render(
      <QueryClientProvider client={qc}>
        <I18nextProvider i18n={i18n}>
          <DeleteFriendCard />
        </I18nextProvider>
      </QueryClientProvider>,
    ),
  };
}

beforeEach(async () => {
  vi.clearAllMocks();
  await i18n.changeLanguage('en');
  useAuthMock.mockImplementation(
    (sel: (s: { session: { user: { id: string } } | null; profile: { role: string } | null }) => unknown) =>
      sel({
        session: { user: { id: 'owner-uuid' } },
        profile: { role: 'owner' },
      }),
  );
  useFriendsQueryMock.mockReturnValue({
    data: [
      { userId: 'friend-a', displayName: 'Alice', avatarUrl: null },
      { userId: 'friend-b', displayName: 'Bob', avatarUrl: null },
    ],
    isLoading: false,
    error: null,
  });
  deleteFriendMock.mockResolvedValue({
    id: 'friend-a',
    target_user_id: 'friend-a',
    deleted_at: '2026-06-30T00:00:00.000Z',
    conversations_left: 3,
  });
});

// ----------------------------------------------------------------------------
// Rendering & state machine (idle)
// ----------------------------------------------------------------------------

describe('M6-5 DeleteFriendCard — initial render', () => {
  it('renders the friend picker + Delete friend button + no error strip', () => {
    renderCard();
    expect(screen.getByTestId('settings-admin-card-delete')).toBeTruthy();
    expect(screen.getByTestId('settings-admin-delete-friend-select')).toBeTruthy();
    expect(screen.getByTestId('settings-admin-delete-open')).toBeTruthy();
    expect(screen.queryByTestId('settings-admin-delete-error')).toBeNull();
    expect(screen.queryByTestId('settings-admin-delete-success')).toBeNull();
  });

  it('renders empty-state when friends query returns []', () => {
    useFriendsQueryMock.mockReturnValueOnce({
      data: [],
      isLoading: false,
      error: null,
    });
    renderCard();
    expect(screen.getByTestId('settings-admin-delete-no-friends')).toBeTruthy();
    expect(screen.queryByTestId('settings-admin-delete-open')).toBeNull();
  });

  it('renders loading-state text when useFriendsQuery is loading', () => {
    useFriendsQueryMock.mockReturnValueOnce({
      data: undefined,
      isLoading: true,
      error: null,
    });
    renderCard();
    expect(screen.getByTestId('settings-admin-delete-loading')).toBeTruthy();
  });

  it('Delete friend button is disabled until a friend is picked', () => {
    renderCard();
    const button = screen.getByTestId('settings-admin-delete-open') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    const select = screen.getByTestId('settings-admin-delete-friend-select') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'friend-a' } });
    expect(button.disabled).toBe(false);
  });
});

// ----------------------------------------------------------------------------
// Modal open / cancel
// ----------------------------------------------------------------------------

describe('M6-5 DeleteFriendCard — modal gate', () => {
  it('opens ConfirmModal after Delete friend click', async () => {
    renderCard();
    fireEvent.change(
      screen.getByTestId('settings-admin-delete-friend-select'),
      { target: { value: 'friend-a' } },
    );
    fireEvent.click(screen.getByTestId('settings-admin-delete-open'));
    await waitFor(() => {
      expect(screen.getByTestId('confirm-modal-delete')).toBeTruthy();
    });
    expect(screen.getByTestId('confirm-modal-delete-input')).toBeTruthy();
  });

  it('modal submit disabled until phrase "confirm" typed', async () => {
    renderCard();
    fireEvent.change(
      screen.getByTestId('settings-admin-delete-friend-select'),
      { target: { value: 'friend-a' } },
    );
    fireEvent.click(screen.getByTestId('settings-admin-delete-open'));
    await waitFor(() => {
      expect(screen.getByTestId('confirm-modal-delete')).toBeTruthy();
    });
    const submit = screen.getByTestId('confirm-modal-delete-submit') as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    fireEvent.change(screen.getByTestId('confirm-modal-delete-input'), {
      target: { value: 'confirm' },
    });
    expect(submit.disabled).toBe(false);
  });

  it('cancel on modal returns to idle (no delete call)', async () => {
    renderCard();
    fireEvent.change(
      screen.getByTestId('settings-admin-delete-friend-select'),
      { target: { value: 'friend-a' } },
    );
    fireEvent.click(screen.getByTestId('settings-admin-delete-open'));
    await waitFor(() => {
      expect(screen.getByTestId('confirm-modal-delete')).toBeTruthy();
    });
    fireEvent.click(screen.getByTestId('confirm-modal-delete-cancel'));
    await waitFor(() => {
      expect(screen.queryByTestId('confirm-modal-delete')).toBeNull();
    });
    expect(deleteFriendMock).not.toHaveBeenCalled();
  });
});

// ----------------------------------------------------------------------------
// Confirm → adminApi.deleteFriend → success card
// ----------------------------------------------------------------------------

describe('M6-5 DeleteFriendCard — confirm flow', () => {
  it('on confirm → adminApi.deleteFriend called with targetUserId + success card', async () => {
    const { invalidateSpy } = renderCard();
    fireEvent.change(
      screen.getByTestId('settings-admin-delete-friend-select'),
      { target: { value: 'friend-a' } },
    );
    fireEvent.click(screen.getByTestId('settings-admin-delete-open'));
    await waitFor(() => {
      expect(screen.getByTestId('confirm-modal-delete')).toBeTruthy();
    });
    fireEvent.change(screen.getByTestId('confirm-modal-delete-input'), {
      target: { value: 'confirm' },
    });
    fireEvent.click(screen.getByTestId('confirm-modal-delete-submit'));
    await waitFor(() => {
      expect(deleteFriendMock).toHaveBeenCalledTimes(1);
    });
    expect(deleteFriendMock.mock.calls[0]![0]).toEqual({
      targetUserId: 'friend-a',
    });

    await waitFor(() => {
      expect(screen.getByTestId('settings-admin-delete-success')).toBeTruthy();
    });
    expect(
      screen.getByTestId('settings-admin-delete-success').textContent,
    ).toMatch(/3/);

    // Cache invalidation triggered for useFriendsQuery
    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalled();
    });
    const lastCall = invalidateSpy.mock.calls[
      invalidateSpy.mock.calls.length - 1
    ]?.[0];
    expect(lastCall?.queryKey).toEqual(['friends', 'owner-uuid']);
  });

  it('After success → Done button returns to idle', async () => {
    renderCard();
    fireEvent.change(
      screen.getByTestId('settings-admin-delete-friend-select'),
      { target: { value: 'friend-a' } },
    );
    fireEvent.click(screen.getByTestId('settings-admin-delete-open'));
    await waitFor(() => {
      expect(screen.getByTestId('confirm-modal-delete')).toBeTruthy();
    });
    fireEvent.change(screen.getByTestId('confirm-modal-delete-input'), {
      target: { value: 'confirm' },
    });
    fireEvent.click(screen.getByTestId('confirm-modal-delete-submit'));
    await waitFor(() => {
      expect(screen.getByTestId('settings-admin-delete-success')).toBeTruthy();
    });
    fireEvent.click(screen.getByTestId('settings-admin-delete-done'));
    await waitFor(() => {
      expect(screen.queryByTestId('settings-admin-delete-success')).toBeNull();
    });
    expect(
      screen.getByTestId('settings-admin-delete-friend-select'),
    ).toBeTruthy();
  });
});

// ----------------------------------------------------------------------------
// Error surfacing
// ----------------------------------------------------------------------------

describe('M6-5 DeleteFriendCard — error surfacing', () => {
  it('E_RES_NOT_FOUND → friendNotFound i18n key', async () => {
    deleteFriendMock.mockRejectedValueOnce({
      code: 'E_RES_NOT_FOUND',
      message: 'Friend no longer exists',
    });
    renderCard();
    fireEvent.change(
      screen.getByTestId('settings-admin-delete-friend-select'),
      { target: { value: 'friend-a' } },
    );
    fireEvent.click(screen.getByTestId('settings-admin-delete-open'));
    await waitFor(() => {
      expect(screen.getByTestId('confirm-modal-delete')).toBeTruthy();
    });
    fireEvent.change(screen.getByTestId('confirm-modal-delete-input'), {
      target: { value: 'confirm' },
    });
    fireEvent.click(screen.getByTestId('confirm-modal-delete-submit'));
    await waitFor(() => {
      expect(screen.getByTestId('settings-admin-delete-error')).toBeTruthy();
    });
    expect(screen.getByTestId('settings-admin-delete-error').textContent).toBe(
      'Friend not found.',
    );
  });

  it('E_AUTH_FORBIDDEN → forbidden i18n key', async () => {
    deleteFriendMock.mockRejectedValueOnce({
      code: 'E_AUTH_FORBIDDEN',
      message: 'Only the Owner may delete friends',
    });
    renderCard();
    fireEvent.change(
      screen.getByTestId('settings-admin-delete-friend-select'),
      { target: { value: 'friend-a' } },
    );
    fireEvent.click(screen.getByTestId('settings-admin-delete-open'));
    await waitFor(() => {
      expect(screen.getByTestId('confirm-modal-delete')).toBeTruthy();
    });
    fireEvent.change(screen.getByTestId('confirm-modal-delete-input'), {
      target: { value: 'confirm' },
    });
    fireEvent.click(screen.getByTestId('confirm-modal-delete-submit'));
    await waitFor(() => {
      expect(screen.getByTestId('settings-admin-delete-error')).toBeTruthy();
    });
    expect(screen.getByTestId('settings-admin-delete-error').textContent).toBe(
      'Only the Owner can delete friends.',
    );
  });

  it('BAD_USER_ID envelope → invalidInput i18n key', async () => {
    deleteFriendMock.mockRejectedValueOnce({
      code: 'BAD_USER_ID',
      message: 'target_user_id must be a UUID',
    });
    renderCard();
    fireEvent.change(
      screen.getByTestId('settings-admin-delete-friend-select'),
      { target: { value: 'friend-a' } },
    );
    fireEvent.click(screen.getByTestId('settings-admin-delete-open'));
    await waitFor(() => {
      expect(screen.getByTestId('confirm-modal-delete')).toBeTruthy();
    });
    fireEvent.change(screen.getByTestId('confirm-modal-delete-input'), {
      target: { value: 'confirm' },
    });
    fireEvent.click(screen.getByTestId('confirm-modal-delete-submit'));
    await waitFor(() => {
      expect(screen.getByTestId('settings-admin-delete-error')).toBeTruthy();
    });
    expect(screen.getByTestId('settings-admin-delete-error').textContent).toBe(
      'Invalid delete configuration.',
    );
  });

  it('unknown code → generic fallback', async () => {
    deleteFriendMock.mockRejectedValueOnce({
      code: 'WEIRD_UNEXPECTED',
      message: 'mystery',
    });
    renderCard();
    fireEvent.change(
      screen.getByTestId('settings-admin-delete-friend-select'),
      { target: { value: 'friend-a' } },
    );
    fireEvent.click(screen.getByTestId('settings-admin-delete-open'));
    await waitFor(() => {
      expect(screen.getByTestId('confirm-modal-delete')).toBeTruthy();
    });
    fireEvent.change(screen.getByTestId('confirm-modal-delete-input'), {
      target: { value: 'confirm' },
    });
    fireEvent.click(screen.getByTestId('confirm-modal-delete-submit'));
    await waitFor(() => {
      expect(screen.getByTestId('settings-admin-delete-error')).toBeTruthy();
    });
    expect(screen.getByTestId('settings-admin-delete-error').textContent).toBe(
      'Something went wrong.',
    );
  });
});

// ----------------------------------------------------------------------------
// Pre-flight guards
// ----------------------------------------------------------------------------

describe('M6-5 DeleteFriendCard — pre-flight guards', () => {
  it('non-owner profile → forbidden short-circuit (no adminApi call)', () => {
    useAuthMock.mockImplementation(
      (sel: (s: { session: { user: { id: string } } | null; profile: { role: string } | null }) => unknown) =>
        sel({
          session: { user: { id: 'friend-a' } },
          profile: { role: 'friend' },
        }),
    );
    renderCard();
    fireEvent.change(
      screen.getByTestId('settings-admin-delete-friend-select'),
      { target: { value: 'friend-a' } },
    );
    fireEvent.click(screen.getByTestId('settings-admin-delete-open'));
    // The card pre-flight-checks isOwner and short-circuits with a
    // forbidden message — adminApi.deleteFriend must NOT be called.
    const createMock = deleteFriendMock;
    expect(createMock).not.toHaveBeenCalled();
    expect(screen.getByTestId('settings-admin-delete-error').textContent).toBe(
      'Only the Owner can delete friends.',
    );
  });

  it('unauthenticated → unauthorized short-circuit (no adminApi call)', () => {
    useAuthMock.mockImplementation(
      (sel: (s: { session: { user: { id: string } } | null; profile: { role: string } | null }) => unknown) =>
        sel({
          session: null,
          profile: null,
        }),
    );
    renderCard();
    fireEvent.change(
      screen.getByTestId('settings-admin-delete-friend-select'),
      { target: { value: 'friend-a' } },
    );
    fireEvent.click(screen.getByTestId('settings-admin-delete-open'));
    expect(deleteFriendMock).not.toHaveBeenCalled();
    expect(screen.getByTestId('settings-admin-delete-error').textContent).toBe(
      'Your session has expired. Please sign in again.',
    );
  });
});
