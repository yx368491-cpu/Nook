/**
 * Nook M6-4.1 · ResetPasswordPlaceholderPage tests.
 *
 * Lives at /reset-password/:token. M6-4.1 replaces the placeholder stub
 * with a full password reset form (new password + confirm + submit).
 * Coverage: invalid token, form rendering, client validation, submit,
 * success state, error states.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/lib/i18n';
import ResetPasswordPlaceholderPage from './ResetPasswordPlaceholderPage';

// Mock adminApi.resetPasswordComplete
vi.mock('@/lib/api/admin', () => ({
  adminApi: {
    resetPasswordComplete: vi.fn(),
  },
}));

import { adminApi } from '@/lib/api/admin';
const mockResetComplete = vi.mocked(adminApi.resetPasswordComplete);

const VALID_TOKEN = 'abcdefghijklmnopqrstuvwxyz123456'; // 32-char base64url

function renderAt(token: string) {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={[`/reset-password/${token}`]}>
        <Routes>
          <Route
            path="/reset-password/:token"
            element={<ResetPasswordPlaceholderPage />}
          />
          <Route path="/welcome" element={<div data-testid="welcome-stub" />} />
          <Route path="/login" element={<div data-testid="login-stub" />} />
        </Routes>
      </MemoryRouter>
    </I18nextProvider>,
  );
}

function fillForm(password: string, confirm: string) {
  fireEvent.change(screen.getByTestId('reset-password-new-password'), {
    target: { value: password },
  });
  fireEvent.change(screen.getByTestId('reset-password-confirm-password'), {
    target: { value: confirm },
  });
}

describe('M6-4.1 ResetPasswordPlaceholderPage — full form', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Page chrome ────────────────────────────────────────────────
  it('renders page chrome with valid token', () => {
    renderAt(VALID_TOKEN);
    expect(screen.getByTestId('reset-password-page')).toBeTruthy();
    expect(screen.getByTestId('reset-password-form')).toBeTruthy();
    expect(screen.getByTestId('reset-password-token-display')).toBeTruthy();
    expect(screen.getByTestId('reset-password-submit')).toBeTruthy();
  });

  // ── Invalid token ──────────────────────────────────────────────
  it('shows invalid-token card when token is not 32-char base64url', () => {
    renderAt('bad-token-shape');
    expect(screen.getByTestId('reset-password-invalid-token')).toBeTruthy();
    expect(screen.queryByTestId('reset-password-form')).toBeNull();
  });

  it('shows invalid-token card when token is empty', () => {
    // Use optional :token? param to test empty token edge case
    render(
      <I18nextProvider i18n={i18n}>
        <MemoryRouter initialEntries={['/reset-password/']}>
          <Routes>
            <Route
              path="/reset-password/:token?"
              element={<ResetPasswordPlaceholderPage />}
            />
          </Routes>
        </MemoryRouter>
      </I18nextProvider>,
    );
    expect(screen.getByTestId('reset-password-invalid-token')).toBeTruthy();
    expect(screen.queryByTestId('reset-password-form')).toBeNull();
  });

  it('shows invalid-token when token is missing param entirely', () => {
    // Route without :token param
    render(
      <I18nextProvider i18n={i18n}>
        <MemoryRouter initialEntries={['/reset-password/']}>
          <Routes>
            <Route
              path="/reset-password/:token?"
              element={<ResetPasswordPlaceholderPage />}
            />
          </Routes>
        </MemoryRouter>
      </I18nextProvider>,
    );
    expect(screen.getByTestId('reset-password-invalid-token')).toBeTruthy();
  });

  // ── Client-side validation ─────────────────────────────────────
  it('shows client validation error when passwords do not match', async () => {
    renderAt(VALID_TOKEN);
    fillForm('password123', 'password456');
    fireEvent.click(screen.getByTestId('reset-password-submit'));

    await waitFor(() => {
      expect(
        screen.getByTestId('reset-password-validation-error'),
      ).toBeTruthy();
    });
    expect(mockResetComplete).not.toHaveBeenCalled();
  });

  it('shows client validation error when password is too short', async () => {
    renderAt(VALID_TOKEN);
    fillForm('short', 'short');
    fireEvent.click(screen.getByTestId('reset-password-submit'));

    await waitFor(() => {
      expect(
        screen.getByTestId('reset-password-validation-error'),
      ).toBeTruthy();
    });
    expect(mockResetComplete).not.toHaveBeenCalled();
  });

  it('clears validation error on subsequent submit', async () => {
    renderAt(VALID_TOKEN);
    // First submit with mismatch
    fillForm('short', 'short');
    fireEvent.click(screen.getByTestId('reset-password-submit'));

    await waitFor(() => {
      expect(
        screen.getByTestId('reset-password-validation-error'),
      ).toBeTruthy();
    });

    // Fix passwords and resubmit
    mockResetComplete.mockResolvedValueOnce({
      success: true,
      message: 'OK',
    });
    fillForm('newpassword123', 'newpassword123');
    fireEvent.click(screen.getByTestId('reset-password-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('reset-password-success')).toBeTruthy();
    });
  });

  // ── Successful submit ──────────────────────────────────────────
  it('calls resetPasswordComplete with token and password on valid submit', async () => {
    mockResetComplete.mockResolvedValueOnce({
      success: true,
      message: 'Password updated',
    });

    renderAt(VALID_TOKEN);
    fillForm('newpassword123', 'newpassword123');
    fireEvent.click(screen.getByTestId('reset-password-submit'));

    await waitFor(() => {
      expect(mockResetComplete).toHaveBeenCalledWith({
        token: VALID_TOKEN,
        password: 'newpassword123',
      });
    });
  });

  it('shows success card after successful reset', async () => {
    mockResetComplete.mockResolvedValueOnce({
      success: true,
      message: 'Password updated',
    });

    renderAt(VALID_TOKEN);
    fillForm('newpassword123', 'newpassword123');
    fireEvent.click(screen.getByTestId('reset-password-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('reset-password-success')).toBeTruthy();
    });

    // Login link should be present
    expect(screen.getByTestId('reset-password-login-link')).toBeTruthy();
  });

  // ── Error states ───────────────────────────────────────────────
  it('shows error strip on server E_RES_TOKEN_EXPIRED', async () => {
    const err = new Error('Token expired');
    (err as { code?: string }).code = 'E_RES_TOKEN_EXPIRED';
    mockResetComplete.mockRejectedValueOnce(err);

    renderAt(VALID_TOKEN);
    fillForm('newpassword123', 'newpassword123');
    fireEvent.click(screen.getByTestId('reset-password-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('reset-password-server-error')).toBeTruthy();
    });
  });

  it('shows error strip on server E_RES_TOKEN_USED', async () => {
    const err = new Error('Token already used');
    (err as { code?: string }).code = 'E_RES_TOKEN_USED';
    mockResetComplete.mockRejectedValueOnce(err);

    renderAt(VALID_TOKEN);
    fillForm('newpassword123', 'newpassword123');
    fireEvent.click(screen.getByTestId('reset-password-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('reset-password-server-error')).toBeTruthy();
    });
  });

  it('shows error strip on server E_RES_NOT_FOUND', async () => {
    const err = new Error('Token not found');
    (err as { code?: string }).code = 'E_RES_NOT_FOUND';
    mockResetComplete.mockRejectedValueOnce(err);

    renderAt(VALID_TOKEN);
    fillForm('newpassword123', 'newpassword123');
    fireEvent.click(screen.getByTestId('reset-password-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('reset-password-server-error')).toBeTruthy();
    });
  });

  it('shows error strip on server E_RES_TOKEN_REVOKED', async () => {
    const err = new Error('Token revoked');
    (err as { code?: string }).code = 'E_RES_TOKEN_REVOKED';
    mockResetComplete.mockRejectedValueOnce(err);

    renderAt(VALID_TOKEN);
    fillForm('newpassword123', 'newpassword123');
    fireEvent.click(screen.getByTestId('reset-password-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('reset-password-server-error')).toBeTruthy();
    });
  });

  it('shows error strip on generic server error', async () => {
    mockResetComplete.mockRejectedValueOnce(new Error('Network error'));

    renderAt(VALID_TOKEN);
    fillForm('newpassword123', 'newpassword123');
    fireEvent.click(screen.getByTestId('reset-password-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('reset-password-server-error')).toBeTruthy();
    });
  });

  // ── Submit gating ──────────────────────────────────────────────
  it('submit button is disabled when form is empty', () => {
    renderAt(VALID_TOKEN);
    const btn = screen.getByTestId('reset-password-submit') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('submit button is enabled when both fields are filled', () => {
    renderAt(VALID_TOKEN);
    fillForm('newpassword123', 'newpassword123');
    const btn = screen.getByTestId('reset-password-submit') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  it('submit button shows loading state while submitting', async () => {
    // Use a deferred promise that doesn't resolve during the assertion
    let deferredResolve: (v: { success: boolean; message: string }) => void;
    mockResetComplete.mockImplementationOnce(
      () => new Promise((resolve) => { deferredResolve = resolve; }),
    );

    renderAt(VALID_TOKEN);
    fillForm('newpassword123', 'newpassword123');
    fireEvent.click(screen.getByTestId('reset-password-submit'));

    // The Button component renders a spinner SVG when loading=true,
    // so check aria-busy rather than textContent
    await waitFor(() => {
      const btn = screen.getByTestId('reset-password-submit');
      expect(btn.getAttribute('aria-busy')).toBe('true');
    });

    // Clean up: resolve the deferred promise
    deferredResolve!({ success: true, message: 'OK' });
  });
});
