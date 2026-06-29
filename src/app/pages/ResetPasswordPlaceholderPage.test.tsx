/**
 * Nook M6-4 · ResetPasswordPlaceholderPage tests.
 *
 * Lives at /reset-password/:token. Friend-side completion ships in
 * M6-4.1; until then this page is a static honest "coming soon"
 * surface that echoes the token. Coverage: token echo + home button.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/lib/i18n';
import ResetPasswordPlaceholderPage from './ResetPasswordPlaceholderPage';

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
        </Routes>
      </MemoryRouter>
    </I18nextProvider>,
  );
}

describe('M6-4 ResetPasswordPlaceholderPage', () => {
  it('renders the page chrome + token echo code', () => {
    renderAt('sample-token-xyz');
    expect(screen.getByTestId('reset-password-placeholder-page')).toBeTruthy();
    expect(screen.getByTestId('reset-password-placeholder-token').textContent)
      .toContain('sample-token-xyz');
  });

  it('renders without token block when params.token is missing', () => {
    // Defensive code path: a malformed URL could land on this route
    // without a token. The page must still render without throwing.
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
    expect(screen.getByTestId('reset-password-placeholder-page')).toBeTruthy();
    expect(screen.queryByTestId('reset-password-placeholder-token')).toBeNull();
  });

  it('home button links back via anchor (caller navigates)', () => {
    renderAt('sample-token-xyz');
    // The button is wrapped in a <Link to="/welcome"> — render-dom
    // gives an anchor element to click; the test only asserts the
    // element is present (full navigation is exercised by E2E suite
    // not present in v1.0).
    expect(screen.getByTestId('reset-password-placeholder-home')).toBeTruthy();
  });
});
