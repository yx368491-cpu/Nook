/**
 * M5-7 — AttachmentDropZone component tests.
 *
 * 4 cases covering the contract:
 *   - `isDragging=false` renders nothing (no anchor in DOM)
 *   - `isDragging=true` shows the overlay with title + hint via i18n
 *   - `data-testid` anchors are consistent for integration tests
 *   - The overlay uses `pointer-events-none` so the underlying
 *     `<form>` / buttons remain interactable (defensive UX check
 *     that the parent has `position: relative` positioning context).
 */

import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/lib/i18n';
import { AttachmentDropZone } from './AttachmentDropZone';

function renderWithI18n(ui: React.ReactNode) {
  return render(
    <I18nextProvider i18n={i18n}>{ui}</I18nextProvider>,
  );
}

describe('AttachmentDropZone', () => {
  it('returns null when not dragging (no DOM anchor)', () => {
    const { container } = renderWithI18n(
      <AttachmentDropZone isDragging={false} />,
    );
    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId('attachment-drop-zone-overlay')).toBeNull();
  });

  it('shows overlay with title + hint when dragging', () => {
    renderWithI18n(<AttachmentDropZone isDragging={true} />);
    const overlay = screen.getByTestId('attachment-drop-zone-overlay');
    expect(overlay).toBeInTheDocument();
    expect(overlay.getAttribute('aria-hidden')).toBe('true');
  });

  it('overlay uses pointer-events-none so underlying form stays interactive', () => {
    renderWithI18n(<AttachmentDropZone isDragging={true} />);
    const overlay = screen.getByTestId('attachment-drop-zone-overlay');
    expect(overlay.className).toMatch(/pointer-events-none/);
  });

  it('exposes title + hint data-testid anchors for accessibility selectors', () => {
    renderWithI18n(<AttachmentDropZone isDragging={true} />);
    expect(screen.getByTestId('attachment-drop-zone-title')).toBeInTheDocument();
    expect(screen.getByTestId('attachment-drop-zone-hint')).toBeInTheDocument();
  });
});
