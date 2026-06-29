/**
 * M5-7 — useFileUploadProgress unit tests.
 *
 * 8 cases covering the lifecycle the hook is contractually responsible
 * for. No XMLHttpRequest stubbing needed because the hook itself is
 * pure local state — the XHR wiring lives in chat.ts (uploadAttachmentBytes)
 * which has its own test coverage in useSendMessage-test flow.
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFileUploadProgress } from './useFileUploadProgress';

function makeFakeFile(name: string, size: number): File {
  const blob = new Blob([new ArrayBuffer(size)], {
    type: 'application/octet-stream',
  });
  return new File([blob], name, { type: 'application/octet-stream' });
}

describe('useFileUploadProgress', () => {
  it('starts with null state and isUploading=false', () => {
    const { result } = renderHook(() => useFileUploadProgress());
    expect(result.current.state).toBeNull();
    expect(result.current.isUploading).toBe(false);
  });

  it('start(file) sets state with file metadata + returns onProgress + signal', () => {
    const { result } = renderHook(() => useFileUploadProgress());
    const file = makeFakeFile('report.pdf', 5_242_880);
    let returned: ReturnType<typeof result.current.start> | null = null;
    act(() => {
      returned = result.current.start(file);
    });
    expect(returned).not.toBeNull();
    expect(result.current.state).toEqual({
      loaded: 0,
      total: 5_242_880,
      fileName: 'report.pdf',
    });
    expect(result.current.isUploading).toBe(true);
    expect(returned!.signal).toBeInstanceOf(AbortSignal);
    expect(returned!.signal.aborted).toBe(false);
    expect(typeof returned!.onProgress).toBe('function');
  });

  it('onProgress callback advances (loaded, total) into state', () => {
    const { result } = renderHook(() => useFileUploadProgress());
    const file = makeFakeFile('doc.pdf', 1024);
    let progressFn: ((loaded: number, total: number) => void) | null = null;
    act(() => {
      progressFn = result.current.start(file).onProgress;
    });
    act(() => {
      progressFn!(512, 1024);
    });
    expect(result.current.state).toEqual({
      loaded: 512,
      total: 1024,
      fileName: 'doc.pdf',
    });
    act(() => {
      progressFn!(1024, 1024);
    });
    expect(result.current.state).toEqual({
      loaded: 1024,
      total: 1024,
      fileName: 'doc.pdf',
    });
  });

  it('onProgress callback after cancel() is a no-op', () => {
    const { result } = renderHook(() => useFileUploadProgress());
    const file = makeFakeFile('doc.pdf', 1024);
    let returned: ReturnType<typeof result.current.start> | null = null;
    act(() => {
      returned = result.current.start(file);
    });
    act(() => {
      result.current.cancel();
    });
    expect(result.current.state).toBeNull();
    expect(result.current.isUploading).toBe(false);
    act(() => {
      returned!.onProgress(512, 1024);
    });
    expect(result.current.state).toBeNull();
  });

  it('cancel() signals abort + clears state', () => {
    const { result } = renderHook(() => useFileUploadProgress());
    const file = makeFakeFile('doc.pdf', 1024);
    let returned: ReturnType<typeof result.current.start> | null = null;
    act(() => {
      returned = result.current.start(file);
    });
    expect(returned!.signal.aborted).toBe(false);
    act(() => {
      result.current.cancel();
    });
    expect(returned!.signal.aborted).toBe(true);
    expect(result.current.state).toBeNull();
    expect(result.current.isUploading).toBe(false);
  });

  it('start() aborts a prior in-flight upload before the new one begins', () => {
    const { result } = renderHook(() => useFileUploadProgress());
    const file1 = makeFakeFile('a.pdf', 1024);
    const file2 = makeFakeFile('b.pdf', 2048);
    let first: ReturnType<typeof result.current.start> | null = null;
    act(() => {
      first = result.current.start(file1);
    });
    expect(first!.signal.aborted).toBe(false);
    act(() => {
      result.current.start(file2);
    });
    expect(first!.signal.aborted).toBe(true);
    expect(result.current.state?.fileName).toBe('b.pdf');
  });

  it('reset() clears state without aborting (end-of-transfer path)', () => {
    const { result } = renderHook(() => useFileUploadProgress());
    const file = makeFakeFile('doc.pdf', 1024);
    let returned: ReturnType<typeof result.current.start> | null = null;
    act(() => {
      returned = result.current.start(file);
    });
    expect(returned!.signal.aborted).toBe(false);
    act(() => {
      result.current.reset();
    });
    expect(result.current.state).toBeNull();
    expect(returned!.signal.aborted).toBe(false);
  });

  it('unmounting with in-flight upload aborts the XHR (zombie cleanup)', () => {
    const { result, unmount } = renderHook(() => useFileUploadProgress());
    const file = makeFakeFile('doc.pdf', 1024);
    let returned: ReturnType<typeof result.current.start> | null = null;
    act(() => {
      returned = result.current.start(file);
    });
    expect(returned!.signal.aborted).toBe(false);
    unmount();
    expect(returned!.signal.aborted).toBe(true);
  });
});
