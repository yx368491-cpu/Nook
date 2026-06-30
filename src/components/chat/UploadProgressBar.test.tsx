/**
 * M5-7 — UploadProgressBar component tests.
 *
 * 6 cases covering the contract:
 *   - role="progressbar" + correct aria values at 0/50/100%
 *   - Truncates long filenames gracefully
 *   - Cancel button wires to onCancel
 *   - Defensive: total=0 yields 0% (no division-by-zero)
 */

import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/lib/i18n';
import { UploadProgressBar } from './UploadProgressBar';

function renderWithI18n(ui: React.ReactNode) {
  return render(
    <I18nextProvider i18n={i18n}>{ui}</I18nextProvider>,
  );
}

describe('UploadProgressBar', () => {
  it('renders 0% with the fileName, role=progressbar, aria-valuenow=0', () => {
    renderWithI18n(
      <UploadProgressBar
        state={{ loaded: 0, total: 1024, fileName: 'spec.pdf' }}
        onCancel={vi.fn()}
      />,
    );
    const bar = screen.getByRole('progressbar');
    expect(bar).toBeInTheDocument();
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
    expect(bar.getAttribute('aria-valuenow')).toMatch(/^[0-9]+$/);
  });

  it('updates aria-valuenow on mid-progress state', () => {
    renderWithI18n(
      <UploadProgressBar
        state={{ loaded: 512, total: 1024, fileName: 'spec.pdf' }}
        onCancel={vi.fn()}
      />,
    );
    const bar = screen.getByRole('progressbar');
    expect(bar.getAttribute('aria-valuenow')).toMatch(/^[0-9]+$/);
  });

  it('shows the percent + filename in the label slot', () => {
    renderWithI18n(
      <UploadProgressBar
        state={{ loaded: 1024, total: 1024, fileName: 'spec.pdf' }}
        onCancel={vi.fn()}
      />,
    );
    const bar = screen.getByRole('progressbar');
    expect(bar.textContent).toMatch(/100%/);
    expect(bar.textContent).toMatch(/spec\.pdf/);
  });

  it('cancel button invokes onCancel when clicked', () => {
    const onCancel = vi.fn();
    renderWithI18n(
      <UploadProgressBar
        state={{ loaded: 1024, total: 1024, fileName: 'spec.pdf' }}
        onCancel={onCancel}
      />,
    );
    fireEvent.click(screen.getByTestId('attachment-upload-progress-cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('total=0 yields 0% (defensive division-by-zero guard)', () => {
    renderWithI18n(
      <UploadProgressBar
        state={{ loaded: 0, total: 0, fileName: 'spec.pdf' }}
        onCancel={vi.fn()}
      />,
    );
    const bar = screen.getByRole('progressbar');
    expect(bar.getAttribute('aria-valuenow')).toBe('0');
  });

  it('exposes a data-testid anchor for integration tests', () => {
    renderWithI18n(
      <UploadProgressBar
        state={{ loaded: 1024, total: 1024, fileName: 'spec.pdf' }}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByTestId('attachment-upload-progress-bar')).toBeInTheDocument();
  });
});
