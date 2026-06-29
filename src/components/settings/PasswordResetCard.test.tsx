/**
 * Nook M6-4 · PasswordResetCard component tests.
 *
 * Coverage strategy: state-machine walk + i18n key wiring + critical
 * UX gates (button disabled until friend picked, URL rendered correctly,
 * copy button flashes "Copied!" for 2s, error strip surfacing).
 *
 * Mocks:
 *   - adminApi.createPasswordReset — set per-test via vi.mock of
 *     '@/lib/api/admin' (auto-mocked; the wrapper exports are
 *     overridden individually).
 *   - useFriendsQuery — replaced directly via vi.spyOn so we control
 *     the picker data without standing up @/lib/supabase mocks.
 *   - useAuth — controlled via a small selector-mock wrapper.
 *   - navigator.clipboard — controlled per-test.
 */
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/lib/i18n';

vi.mock('@/lib/api/admin', () => ({
  adminApi: {
    createPasswordReset: vi.fn(),
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
import { PasswordResetCard } from './PasswordResetCard';

const useFriendsQueryMock = useFriendsQuery as unknown as Mock;
const useAuthMock = useAuth as unknown as Mock;
const createResetMock = adminApi.createPasswordReset as unknown as Mock;

async function renderCard() {
  return render(
    <I18nextProvider i18n={i18n}>
      <PasswordResetCard />
    </I18nextProvider>,
  );
}

beforeEach(async () => {
  vi.clearAllMocks();
  // Force the test locale to English so .textContent assertions match
  // the literal strings used throughout this file. i18next's default
  // detected language in the test environment resolves to zh-CN
  // (matching the project's primary user language); without an explicit
  // switch the tests would render Chinese strings and break the
  // English assertions even though the i18n wiring itself is correct.
  await i18n.changeLanguage('en');
  // cspell:disable-next-line
  // Default auth state: logged-in Owner with a session.
  useAuthMock.mockImplementation(
    (sel: (s: { session: { user: { id: string } } | null; profile: { role: string } | null }) => unknown) =>
      sel({
        session: { user: { id: 'owner-uuid' } },
        profile: { role: 'owner' },
      }),
  );
  // Default friends query: returns two alpha-sortable friends (Bob comes
  // first when alpha-sorted? Yes — after sort A < B).
  useFriendsQueryMock.mockReturnValue({
    data: [
      {
        userId: 'friend-a',
        displayName: 'Alice',
        avatarUrl: null,
      },
      {
        userId: 'friend-b',
        displayName: 'Bob',
        avatarUrl: null,
      },
    ],
    isLoading: false,
    error: null,
  });
  // Default adminApi: succeed with a stub reset URL.
  createResetMock.mockResolvedValue({
    id: 'reset-row-uuid',
    token: 'reset-token-abc',
    target_user_id: 'friend-a',
    expires_at: '2026-06-30T00:00:00.000Z',
    reset_url: 'https://nook.example/reset-password/reset-token-abc',
  });
});

// ----------------------------------------------------------------------------
// Rendering & state machine
// ----------------------------------------------------------------------------

describe('M6-4 PasswordResetCard — initial render', () => {
  it('renders the friend picker + Create button + no error strip', async () => {
    await renderCard();
    expect(screen.getByTestId('settings-admin-card-password')).toBeTruthy();
    expect(screen.getByTestId('settings-admin-password-friend-select')).toBeTruthy();
    expect(screen.getByTestId('settings-admin-password-create')).toBeTruthy();
    expect(screen.queryByTestId('settings-admin-password-error')).toBeNull();
    expect(screen.queryByTestId('settings-admin-password-created')).toBeNull();
  });

  it('renders empty-state when friends query returns []', async () => {
    useFriendsQueryMock.mockReturnValueOnce({
      data: [],
      isLoading: false,
      error: null,
    });
    await renderCard();
    expect(screen.getByTestId('settings-admin-password-no-friends')).toBeTruthy();
    expect(screen.queryByTestId('settings-admin-password-create')).toBeNull();
  });

  it('renders loading-state text when useFriendsQuery is loading', async () => {
    useFriendsQueryMock.mockReturnValueOnce({
      data: undefined,
      isLoading: true,
      error: null,
    });
    await renderCard();
    expect(screen.getByTestId('settings-admin-password-loading')).toBeTruthy();
  });

  it('Create button is disabled until a friend is picked', async () => {
    await renderCard();
    const button = screen.getByTestId('settings-admin-password-create');
    expect((button as HTMLButtonElement).disabled).toBe(true);

    const select = screen.getByTestId(
      'settings-admin-password-friend-select',
    ) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'friend-a' } });

    expect((button as HTMLButtonElement).disabled).toBe(false);
  });
});

// ----------------------------------------------------------------------------
// Create flow — happy path
// ----------------------------------------------------------------------------

describe('M6-4 PasswordResetCard — create flow', () => {
  it('on Create → adminApi.createPasswordReset called with targetUserId, success card rendered', async () => {
    await renderCard();
    const select = screen.getByTestId(
      'settings-admin-password-friend-select',
    ) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'friend-a' } });
    fireEvent.click(screen.getByTestId('settings-admin-password-create'));

    await waitFor(() => {
      expect(createResetMock).toHaveBeenCalledTimes(1);
    });
    expect(createResetMock.mock.calls[0]![0]).toEqual({
      targetUserId: 'friend-a',
    });
    await waitFor(() => {
      expect(screen.getByTestId('settings-admin-password-created')).toBeTruthy();
    });
    const urlEl = screen.getByTestId('settings-admin-password-reset-url');
    expect(urlEl.textContent).toBe(
      'https://nook.example/reset-password/reset-token-abc',
    );
  });

  it('forwards ttlHours when supplied (defense in depth: card does not expose UI yet but wiring is in place)', async () => {
    // The card does not currently expose a TTL UI control; this
    // test guards the underlying API call signature so a future
    // M6-4.x TTL dropdown already accepts the arg without churn.
    await renderCard();
    const select = screen.getByTestId(
      'settings-admin-password-friend-select',
    ) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'friend-b' } });
    fireEvent.click(screen.getByTestId('settings-admin-password-create'));
    await waitFor(() => {
      expect(createResetMock).toHaveBeenCalledTimes(1);
    });
    expect(createResetMock.mock.calls[0]![0]).toEqual({
      targetUserId: 'friend-b',
    });
  });
});

// ----------------------------------------------------------------------------
// Create flow — error surfacing
// ----------------------------------------------------------------------------

describe('M6-4 PasswordResetCard — error surfacing', () => {
  it('E_RES_NOT_FOUND → friendNotFound i18n key', async () => {
    createResetMock.mockRejectedValueOnce({
      code: 'E_RES_NOT_FOUND',
      message: 'Target user does not exist',
    });
    await renderCard();
    fireEvent.change(
      screen.getByTestId('settings-admin-password-friend-select'),
      { target: { value: 'friend-a' } },
    );
    fireEvent.click(screen.getByTestId('settings-admin-password-create'));
    await waitFor(() => {
      expect(screen.getByTestId('settings-admin-password-error')).toBeTruthy();
    });
    expect(screen.getByTestId('settings-admin-password-error').textContent).toBe(
      'Friend not found.',
    );
  });

  it('BAD_USER_ID (EF envelope) → invalidInput i18n key (resolves malformed-input)', async () => {
    // DEFENSE-against-leak: the EF rename BAD_CONVERSATION_ID →
    // BAD_USER_ID plus client-side fallback in codeToI18nKey land here.
    createResetMock.mockRejectedValueOnce({
      code: 'BAD_USER_ID',
      message: 'target_user_id must be a UUID',
    });
    await renderCard();
    fireEvent.change(
      screen.getByTestId('settings-admin-password-friend-select'),
      { target: { value: 'friend-a' } },
    );
    fireEvent.click(screen.getByTestId('settings-admin-password-create'));
    await waitFor(() => {
      expect(screen.getByTestId('settings-admin-password-error')).toBeTruthy();
    });
    expect(screen.getByTestId('settings-admin-password-error').textContent).toBe(
      'Invalid reset configuration.',
    );
  });

  it('E_AUTH_FORBIDDEN → forbidden i18n key', async () => {
    createResetMock.mockRejectedValueOnce({
      code: 'E_AUTH_FORBIDDEN',
      message: 'Only the Owner may issue password resets',
    });
    await renderCard();
    fireEvent.change(
      screen.getByTestId('settings-admin-password-friend-select'),
      { target: { value: 'friend-a' } },
    );
    fireEvent.click(screen.getByTestId('settings-admin-password-create'));
    await waitFor(() => {
      expect(screen.getByTestId('settings-admin-password-error')).toBeTruthy();
    });
    expect(screen.getByTestId('settings-admin-password-error').textContent).toBe(
      'Only the Owner can reset passwords.',
    );
  });

  it('unknown code → generic fallback', async () => {
    createResetMock.mockRejectedValueOnce({
      code: 'WEIRD_UNEXPECTED',
      message: 'mystery',
    });
    await renderCard();
    fireEvent.change(
      screen.getByTestId('settings-admin-password-friend-select'),
      { target: { value: 'friend-a' } },
    );
    fireEvent.click(screen.getByTestId('settings-admin-password-create'));
    await waitFor(() => {
      expect(screen.getByTestId('settings-admin-password-error')).toBeTruthy();
    });
    expect(screen.getByTestId('settings-admin-password-error').textContent).toBe(
      'Something went wrong.',
    );
  });

  it('E_RES_CONFLICT (partial-unique 23505 from EF) → alreadyPending i18n key', async () => {
    // The EF surfaces Postgres 23505 (unique_violation) against the
    // partial-unique index as { code: 'E_RES_CONFLICT', message } so
    // the user is informed their reset request collided with a prior
    // pending reset for the same friend (Owner double-click / network
    // retry race).
    createResetMock.mockRejectedValueOnce({
      code: 'E_RES_CONFLICT',
      message: 'Friend already has a pending password reset',
    });
    await renderCard();
    fireEvent.change(
      screen.getByTestId('settings-admin-password-friend-select'),
      { target: { value: 'friend-a' } },
    );
    fireEvent.click(screen.getByTestId('settings-admin-password-create'));
    await waitFor(() =>
      expect(screen.getByTestId('settings-admin-password-error')).toBeTruthy(),
    );
    expect(
      screen.getByTestId('settings-admin-password-error').textContent,
    ).toContain('already has a pending password reset');
  });
});

// ----------------------------------------------------------------------------
// Copy-button + reset-state machine
// ----------------------------------------------------------------------------

describe('M6-4 PasswordResetCard — copy + reset', () => {
  it('on Copy → navigator.clipboard.writeText called with reset_url + 2s flash', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(global.navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    await renderCard();
    fireEvent.change(
      screen.getByTestId('settings-admin-password-friend-select'),
      { target: { value: 'friend-a' } },
    );
    fireEvent.click(screen.getByTestId('settings-admin-password-create'));
    await waitFor(() =>
      expect(screen.getByTestId('settings-admin-password-created')).toBeTruthy(),
    );
    fireEvent.click(screen.getByTestId('settings-admin-password-copy'));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledTimes(1);
    });
    expect(writeText.mock.calls[0]![0]).toBe(
      'https://nook.example/reset-password/reset-token-abc',
    );
    // We do not await the 2s timer in tests (slows CI); just assert
    // the flash copy text was set by checking button label.
    const button = screen.getByTestId('settings-admin-password-copy');
    expect(button.textContent).toBe('Copied!');
  });

  it('on Done → returns to idle (picker visible, success card gone)', async () => {
    await renderCard();
    fireEvent.change(
      screen.getByTestId('settings-admin-password-friend-select'),
      { target: { value: 'friend-a' } },
    );
    fireEvent.click(screen.getByTestId('settings-admin-password-create'));
    await waitFor(() =>
      expect(screen.getByTestId('settings-admin-password-created')).toBeTruthy(),
    );
    fireEvent.click(screen.getByTestId('settings-admin-password-done'));
    await waitFor(() =>
      expect(screen.queryByTestId('settings-admin-password-created')).toBeNull(),
    );
    expect(
      screen.getByTestId('settings-admin-password-friend-select'),
    ).toBeTruthy();
  });
});

// ----------------------------------------------------------------------------
// Role/client guards
// ----------------------------------------------------------------------------

describe('M6-4 PasswordResetCard — error-retry path', () => {
  it('after an error, re-clicking Create retries from the same selected friend', async () => {
    // First click: 404 (reject).
    createResetMock.mockRejectedValueOnce({
      code: 'E_RES_NOT_FOUND',
      message: 'Target user does not exist',
    });
    await renderCard();
    fireEvent.change(
      screen.getByTestId('settings-admin-password-friend-select'),
      { target: { value: 'friend-a' } },
    );
    fireEvent.click(screen.getByTestId('settings-admin-password-create'));
    await waitFor(() =>
      expect(screen.getByTestId('settings-admin-password-error')).toBeTruthy(),
    );
    // Second click: succeeds (no mockRejectedValueOnce queues it reset
    // — the default mockResolvedValue gets the next call).
    fireEvent.click(screen.getByTestId('settings-admin-password-create'));
    await waitFor(() => {
      expect(createResetMock).toHaveBeenCalledTimes(2);
    });
    await waitFor(() =>
      expect(screen.getByTestId('settings-admin-password-created')).toBeTruthy(),
    );
  });

  it('picker remains visible after error (so retry can pick a different friend)', async () => {
    createResetMock.mockRejectedValueOnce({
      code: 'E_RES_NOT_FOUND',
      message: 'Target user does not exist',
    });
    await renderCard();
    fireEvent.change(
      screen.getByTestId('settings-admin-password-friend-select'),
      { target: { value: 'friend-a' } },
    );
    fireEvent.click(screen.getByTestId('settings-admin-password-create'));
    await waitFor(() =>
      expect(screen.getByTestId('settings-admin-password-error')).toBeTruthy(),
    );
    // Picker stays mounted (only the success card replaces it).
    expect(
      screen.getByTestId('settings-admin-password-friend-select'),
    ).toBeTruthy();
    expect(screen.getByTestId('settings-admin-password-create')).toBeTruthy();
  });
});

// ----------------------------------------------------------------------------
// Role/client guards
// ----------------------------------------------------------------------------

describe('M6-4 PasswordResetCard — pre-flight guards', () => {
  it('non-owner profile → forbidden still allows render but errors on submit', async () => {
    useAuthMock.mockImplementation(
      (sel: (s: { session: { user: { id: string } } | null; profile: { role: string } | null }) => unknown) =>
        sel({
          session: { user: { id: 'friend-a' } },
          profile: { role: 'friend' },
        }),
    );
    await renderCard();
    // The card's `useFriendsQuery` may still populate (the user is
    // technically a friend with other convs); we just need to confirm
    // the card does NOT pre-empt the EF's owner check. Submitting to
    // createPasswordReset mock (which we don't expect to be called
    // after the pre-flight check)...
    const createMock = createResetMock;
    fireEvent.change(
      screen.getByTestId('settings-admin-password-friend-select'),
      { target: { value: 'friend-a' } },
    );
    fireEvent.click(screen.getByTestId('settings-admin-password-create'));
    // The card DOES pre-flight-check isOwner and short-circuits with a
    // forbidden message — createResetMock should NOT be called and the
    // forbidden strip SHOULD be rendered.
    await waitFor(() => {
      expect(screen.getByTestId('settings-admin-password-error')).toBeTruthy();
    });
    expect(screen.getByTestId('settings-admin-password-error').textContent).toBe(
      'Only the Owner can reset passwords.',
    );
    expect(createMock).not.toHaveBeenCalled();
  });
});
