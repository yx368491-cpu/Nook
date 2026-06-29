/**
 * Nook M6-6 · `<ConfirmModal>` test suite.
 *
 * Coverage strategy:
 *   - render gating (open=false → null, open=true → portal-mounted)
 *   - phrase match semantics (case-insensitive trim, partial = no submit)
 *   - submit enable/disable + form submit wiring
 *   - cancel handler firing on Cancel button AND Escape keypress
 *   - warning strip conditional rendering
 *   - loading state disables submit and shows spinner label
 *   - accessibility roles (`role="dialog"`, `aria-modal`, invalid state)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/lib/i18n';
import { ConfirmModal } from './ConfirmModal';

// jsdom does not implement createPortal — but React does the right
// thing when document.body is available. The portal target IS the
// document.body so it roots in our jsdom document tree and queries
// work via `screen`.

beforeEach(async () => {
  vi.clearAllMocks();
  await i18n.changeLanguage('en');
});

function renderModal(props: Parameters<typeof ConfirmModal>[0]) {
  return render(
    <I18nextProvider i18n={i18n}>
      <ConfirmModal {...props} />
    </I18nextProvider>,
  );
}

const baseProps = {
  title: 'Delete this friend?',
  message: 'This will permanently revoke their access to all conversations.',
  submitLabel: 'Delete friend',
  cancelLabel: 'Cancel',
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
};

describe('M6-6 ConfirmModal — render gating', () => {
  it('renders nothing when open=false', () => {
    const { container } = renderModal({ ...baseProps, open: false });
    expect(container.firstChild).toBeNull();
  });

  it('renders title + message + input + submit + cancel when open=true', () => {
    renderModal({ ...baseProps, open: true });
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('Delete this friend?')).toBeTruthy();
    expect(
      screen.getByText(/permanently revoke their access/i),
    ).toBeTruthy();
    expect(screen.getByTestId('confirm-modal-input')).toBeTruthy();
    expect(screen.getByTestId('confirm-modal-submit')).toBeTruthy();
    expect(screen.getByTestId('confirm-modal-cancel')).toBeTruthy();
  });

  it('has role="dialog" + aria-modal="true" + aria-labelledby + aria-describedby', () => {
    renderModal({ ...baseProps, open: true });
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBeTruthy();
    expect(dialog.getAttribute('aria-describedby')).toBeTruthy();
  });
});

describe('M6-6 ConfirmModal — autofocus on open', () => {
  it('focuses the input on next paint after open', async () => {
    renderModal({ ...baseProps, open: true });
    await waitFor(() => {
      expect(document.activeElement).toBe(
        screen.getByTestId('confirm-modal-input'),
      );
    });
  });
});

describe('M6-6 ConfirmModal — phrase match (case-insensitive trim)', () => {
  it('Submit disabled when input is empty', () => {
    renderModal({ ...baseProps, open: true });
    const submit = screen.getByTestId('confirm-modal-submit') as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
  });

  it('Submit disabled when input is the partial phrase "confir"', () => {
    renderModal({ ...baseProps, open: true });
    const input = screen.getByTestId('confirm-modal-input');
    fireEvent.change(input, { target: { value: 'confir' } });
    const submit = screen.getByTestId('confirm-modal-submit') as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
  });

  it('Submit disabled when input is unrelated text "yes please"', () => {
    renderModal({ ...baseProps, open: true });
    const input = screen.getByTestId('confirm-modal-input');
    fireEvent.change(input, { target: { value: 'yes please' } });
    const submit = screen.getByTestId('confirm-modal-submit') as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
  });

  it('Submit enabled when input matches "confirm" (lowercase)', () => {
    renderModal({ ...baseProps, open: true });
    const input = screen.getByTestId('confirm-modal-input');
    fireEvent.change(input, { target: { value: 'confirm' } });
    const submit = screen.getByTestId('confirm-modal-submit') as HTMLButtonElement;
    expect(submit.disabled).toBe(false);
  });

  it('Submit enabled when input matches "CONFIRM" (uppercase case-insensitive)', () => {
    renderModal({ ...baseProps, open: true });
    const input = screen.getByTestId('confirm-modal-input');
    fireEvent.change(input, { target: { value: 'CONFIRM' } });
    const submit = screen.getByTestId('confirm-modal-submit') as HTMLButtonElement;
    expect(submit.disabled).toBe(false);
  });

  it('Submit enabled when input is "  confirm  " (whitespace trim)', () => {
    renderModal({ ...baseProps, open: true });
    const input = screen.getByTestId('confirm-modal-input');
    fireEvent.change(input, { target: { value: '  confirm  ' } });
    const submit = screen.getByTestId('confirm-modal-submit') as HTMLButtonElement;
    expect(submit.disabled).toBe(false);
  });

  it('aria-invalid="true" once user types a mismatching value', () => {
    renderModal({ ...baseProps, open: true });
    const input = screen.getByTestId('confirm-modal-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'nope' } });
    expect(input.getAttribute('aria-invalid')).toBe('true');
  });

  it('aria-invalid="false" (or absent) for empty input — pre-input state', () => {
    renderModal({ ...baseProps, open: true });
    const input = screen.getByTestId('confirm-modal-input') as HTMLInputElement;
    expect(input.getAttribute('aria-invalid')).toBeNull();
  });

  it('Custom phrase "void" replaces the default "confirm"', () => {
    renderModal({ ...baseProps, open: true, phrase: 'void' });
    const input = screen.getByTestId('confirm-modal-input');
    fireEvent.change(input, { target: { value: 'void' } });
    const submit = screen.getByTestId('confirm-modal-submit') as HTMLButtonElement;
    expect(submit.disabled).toBe(false);
  });
});

describe('M6-6 ConfirmModal — onConfirm / onCancel wiring', () => {
  it('onConfirm fires when submit clicked with valid input', () => {
    const onConfirm = vi.fn();
    renderModal({ ...baseProps, open: true, onConfirm });
    fireEvent.change(screen.getByTestId('confirm-modal-input'), {
      target: { value: 'confirm' },
    });
    fireEvent.click(screen.getByTestId('confirm-modal-submit'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('onConfirm does NOT fire when submit clicked with invalid input', () => {
    const onConfirm = vi.fn();
    renderModal({ ...baseProps, open: true, onConfirm });
    fireEvent.change(screen.getByTestId('confirm-modal-input'), {
      target: { value: 'something else' },
    });
    fireEvent.click(screen.getByTestId('confirm-modal-submit'));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('onCancel fires on Cancel button click', () => {
    const onCancel = vi.fn();
    renderModal({ ...baseProps, open: true, onCancel });
    fireEvent.click(screen.getByTestId('confirm-modal-cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('onCancel fires on Escape keypress', () => {
    const onCancel = vi.fn();
    renderModal({ ...baseProps, open: true, onCancel });
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('onCancel does NOT fire on backdrop click (destructive modal)', () => {
    const onCancel = vi.fn();
    renderModal({ ...baseProps, open: true, onCancel });
    // backdrop is rendered via createPortal → lives in document.body
    const backdrop = document.querySelector(
      '[data-testid="confirm-modal-backdrop"]',
    )!;
    fireEvent.click(backdrop);
    expect(onCancel).not.toHaveBeenCalled();
  });
});

describe('M6-6 ConfirmModal — warning + loading', () => {
  it('renders warning strip when warning prop is set', () => {
    renderModal({
      ...baseProps,
      open: true,
      warning: 'This action cannot be undone.',
    });
    expect(screen.getByTestId('confirm-modal-warning')).toBeTruthy();
    expect(screen.getByText(/cannot be undone/i)).toBeTruthy();
  });

  it('omits warning strip when warning prop is undefined', () => {
    renderModal({ ...baseProps, open: true });
    expect(screen.queryByTestId('confirm-modal-warning')).toBeNull();
  });

  it('loading=true DISABLES submit even with valid phrase', () => {
    renderModal({ ...baseProps, open: true, loading: true });
    fireEvent.change(screen.getByTestId('confirm-modal-input'), {
      target: { value: 'confirm' },
    });
    const submit = screen.getByTestId('confirm-modal-submit') as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
  });

  it('loading=true disables Cancel button too', () => {
    renderModal({ ...baseProps, open: true, loading: true });
    const cancel = screen.getByTestId('confirm-modal-cancel') as HTMLButtonElement;
    expect(cancel.disabled).toBe(true);
  });
});

describe('M6-6 ConfirmModal — testIdPrefix isolation', () => {
  it('uses custom prefix when testIdPrefix is provided', () => {
    renderModal({
      ...baseProps,
      open: true,
      testIdPrefix: 'delete-friend',
    });
    expect(screen.getByTestId('delete-friend-input')).toBeTruthy();
    expect(screen.getByTestId('delete-friend-submit')).toBeTruthy();
    expect(screen.getByTestId('delete-friend-cancel')).toBeTruthy();
    expect(screen.queryByTestId('confirm-modal-input')).toBeNull();
  });
});

describe('M6-6 ConfirmModal — input controlled state', () => {
  it('clears input when modal reopens after closing', async () => {
    const { rerender } = renderModal({ ...baseProps, open: true });
    fireEvent.change(screen.getByTestId('confirm-modal-input'), {
      target: { value: 'leftover' },
    });
    expect(
      (screen.getByTestId('confirm-modal-input') as HTMLInputElement).value,
    ).toBe('leftover');
    rerender(
      <I18nextProvider i18n={i18n}>
        <ConfirmModal {...baseProps} open={false} />
      </I18nextProvider>,
    );
    rerender(
      <I18nextProvider i18n={i18n}>
        <ConfirmModal {...baseProps} open={true} />
      </I18nextProvider>,
    );
    await waitFor(() => {
      expect(
        (screen.getByTestId('confirm-modal-input') as HTMLInputElement).value,
      ).toBe('');
    });
  });
});
