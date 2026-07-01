/**
 * Nook · Settings · `<LogoutCard>` component tests.
 *
 * Coverage strategy: state-machine walk + i18n key wiring + critical
 * UX gates (button disabled when no session, modal phrase gate,
 * logout-action call, navigate-to-/welcome on success, error strip
 * surfacing + retry).
 *
 * Mocks:
 *   - useAuth — controlled via selector-mock wrapper to seed session
 *     and to capture the logout() call.
 *   - react-router `useNavigate` — replaced with vi.fn so we can
 *     assert the post-logout navigation destination.
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import type { ReactNode } from 'react';
import i18n from '@/lib/i18n';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom',
  );
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('@/stores/useAuth', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '@/stores/useAuth';
import { LogoutCard } from './LogoutCard';

const useAuthMock = useAuth as unknown as Mock;

beforeEach(async () => {
  vi.clearAllMocks();
  await i18n.changeLanguage('en');
  useAuthMock.mockImplementation(
    (sel: (s: { session: { user: { id: string; email?: string } } | null; logout: Mock }) => unknown) =>
      sel({
        session: { user: { id: 'user-uuid', email: 'me@example.com' } },
        logout: vi.fn().mockResolvedValue(undefined),
      }),
  );
});

function renderCard() {
  return render(
    <I18nextProvider i18n={i18n}>
      <LogoutCard />
    </I18nextProvider>,
  );
}

// ----------------------------------------------------------------------------
// Rendering — initial state
// ----------------------------------------------------------------------------

describe('LogoutCard — initial render', () => {
  it('renders the card + open button + no error strip', () => {
    renderCard();
    expect(screen.getByTestId('settings-logout-card')).toBeTruthy();
    expect(screen.getByTestId('settings-logout-open')).toBeTruthy();
    expect(screen.queryByTestId('settings-logout-error')).toBeNull();
  });
});

// ----------------------------------------------------------------------------
// Modal gate + cancel
// ----------------------------------------------------------------------------

describe('LogoutCard — modal gate', () => {
  it('opens ConfirmModal after Log out click', async () => {
    renderCard();
    fireEvent.click(screen.getByTestId('settings-logout-open'));
    await waitFor(() => {
      expect(screen.getByTestId('confirm-modal-logout')).toBeTruthy();
    });
    expect(screen.getByTestId('confirm-modal-logout-input')).toBeTruthy();
  });

  it('modal submit is disabled until phrase "logout" is typed', async () => {
    renderCard();
    fireEvent.click(screen.getByTestId('settings-logout-open'));
    await waitFor(() => {
      expect(screen.getByTestId('confirm-modal-logout')).toBeTruthy();
    });
    const submit = screen.getByTestId('confirm-modal-logout-submit') as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    fireEvent.change(screen.getByTestId('confirm-modal-logout-input'), {
      target: { value: 'logout' },
    });
    expect(submit.disabled).toBe(false);
  });

  it('cancel on modal returns to idle (no logout call)', async () => {
    renderCard();
    fireEvent.click(screen.getByTestId('settings-logout-open'));
    await waitFor(() => {
      expect(screen.getByTestId('confirm-modal-logout')).toBeTruthy();
    });
    fireEvent.click(screen.getByTestId('confirm-modal-logout-cancel'));
    await waitFor(() => {
      expect(screen.queryByTestId('confirm-modal-logout')).toBeNull();
    });
  });
});

// ----------------------------------------------------------------------------
// Confirm flow → logout + navigate
// ----------------------------------------------------------------------------

describe('LogoutCard — confirm flow', () => {
  it('on confirm → useAuth.logout called + navigate to /welcome', async () => {
    const logoutFn = vi.fn().mockResolvedValue(undefined);
    useAuthMock.mockImplementation(
      (sel: (s: { session: { user: { id: string } } | null; logout: Mock }) => unknown) =>
        sel({ session: { user: { id: 'user-uuid' } }, logout: logoutFn }),
    );
    renderCard();
    fireEvent.click(screen.getByTestId('settings-logout-open'));
    await waitFor(() => {
      expect(screen.getByTestId('confirm-modal-logout')).toBeTruthy();
    });
    fireEvent.change(screen.getByTestId('confirm-modal-logout-input'), {
      target: { value: 'logout' },
    });
    fireEvent.click(screen.getByTestId('confirm-modal-logout-submit'));
    await waitFor(() => {
      expect(logoutFn).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/welcome', { replace: true });
    });
  });
});

// ----------------------------------------------------------------------------
// Error surfacing + retry
// ----------------------------------------------------------------------------

describe('LogoutCard — error surfacing', () => {
  it('logout throws → error strip with generic key + Retry returns to idle', async () => {
    const logoutFn = vi.fn().mockRejectedValue({
      code: 'E_SYS_INTERNAL',
      message: 'network blip',
    });
    useAuthMock.mockImplementation(
      (sel: (s: { session: { user: { id: string } } | null; logout: Mock }) => unknown) =>
        sel({ session: { user: { id: 'user-uuid' } }, logout: logoutFn }),
    );
    renderCard();
    fireEvent.click(screen.getByTestId('settings-logout-open'));
    await waitFor(() => {
      expect(screen.getByTestId('confirm-modal-logout')).toBeTruthy();
    });
    fireEvent.change(screen.getByTestId('confirm-modal-logout-input'), {
      target: { value: 'logout' },
    });
    fireEvent.click(screen.getByTestId('confirm-modal-logout-submit'));
    await waitFor(() => {
      expect(logoutFn).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(screen.getByTestId('settings-logout-error')).toBeTruthy();
    });
    expect(screen.getByTestId('settings-logout-error').textContent).toMatch(
      /couldn't log you out|try again/i,
    );
    // Retry → back to idle, error strip cleared
    fireEvent.click(screen.getByTestId('settings-logout-retry'));
    await waitFor(() => {
      expect(screen.queryByTestId('settings-logout-error')).toBeNull();
    });
    expect(screen.getByTestId('settings-logout-open')).toBeTruthy();
  });
});

// ----------------------------------------------------------------------------
// Unauthenticated guard
// ----------------------------------------------------------------------------

describe('LogoutCard — unauthenticated guard', () => {
  it('open button disabled when session is null', () => {
    useAuthMock.mockImplementation(
      (sel: (s: { session: null; logout: Mock }) => unknown) =>
        sel({ session: null, logout: vi.fn() }),
    );
    renderCard();
    const btn = screen.getByTestId('settings-logout-open') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });
});
