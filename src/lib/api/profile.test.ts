/**
 * Nook M5-6 · Profile API unit tests.
 *
 * Targets `src/lib/api/profile.ts` (pure async helpers using the Supabase
 * client). Mock strategy: `vi.mock('@/lib/supabase')` at module top — keeps
 * the chain mechanics abstracted so tests verify observable contract
 * (calls + args + ordering) rather than SDK internals.
 */
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    storage: { from: vi.fn() },
    from: vi.fn(),
  },
}));

import { supabase } from '@/lib/supabase';
import {
  AVATAR_MAX_BYTES,
  AVATAR_ALLOWED_MIMES,
  AvatarValidationError,
  buildAvatarObjectPath,
  deleteAvatar,
  resolveAvatarPublicUrl,
  updateProfile,
  uploadAvatar,
  validateAvatarFile,
} from './profile';

// =============================================================
// Helpers
// =============================================================

const storageFrom = supabase.storage.from as unknown as Mock;
const from = supabase.from as unknown as Mock;

const pngBytes = () => new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const pngFile = (name = 'a.png', size = pngBytes().length) =>
  new File([pngBytes().slice(0, size)], name, { type: 'image/png' });

let upload: Mock;
let remove: Mock;
let list: Mock;
let getPublicUrl: Mock;
let update: Mock;
let eq: Mock;
let select: Mock;
let single: Mock;

beforeEach(() => {
  upload = vi.fn().mockResolvedValue({ data: { path: 'x' }, error: null });
  remove = vi.fn().mockResolvedValue({ data: [], error: null });
  list = vi.fn().mockResolvedValue({ data: [], error: null });
  getPublicUrl = vi.fn().mockImplementation((path: string) => ({
    data: { publicUrl: `https://x.supabase.co/storage/v1/object/public/avatars/${path}` },
  }));

  update = vi.fn();
  eq = vi.fn();
  select = vi.fn();
  single = vi.fn().mockResolvedValue({
    data: { display_name: 'Test', avatar_url: null },
    error: null,
  });

  // Default chain shapes — updateProfile path: update → eq → select → single.
  update.mockImplementation(() => ({ eq }));
  eq.mockImplementation(() => ({ select }));
  select.mockImplementation(() => ({ single }));

  storageFrom.mockImplementation(() => ({ upload, remove, list, getPublicUrl }));
  from.mockImplementation(() => ({ update, eq, select, single }));
});

// =============================================================
// validateAvatarFile
// =============================================================

describe('M5-6 profile API — validateAvatarFile', () => {
  it.each(AVATAR_ALLOWED_MIMES)('accepts valid %s MIME', (mime) => {
    const f = new File([new Uint8Array([1])], `a.${mime.split('/')[1]}`, { type: mime });
    expect(() => validateAvatarFile(f)).not.toThrow();
  });

  it('rejects empty file (size 0)', () => {
    const empty = new File([], 'empty.png', { type: 'image/png' });
    expect.assertions(2);
    try {
      validateAvatarFile(empty);
    } catch (err) {
      expect(err).toBeInstanceOf(AvatarValidationError);
      expect((err as AvatarValidationError).code).toBe('empty');
    }
  });

  it('rejects file over 5 MB', () => {
    const big = new File([new Uint8Array(AVATAR_MAX_BYTES + 1)], 'big.png', {
      type: 'image/png',
    });
    expect.assertions(1);
    try {
      validateAvatarFile(big);
    } catch (err) {
      expect((err as AvatarValidationError).code).toBe('too_large');
    }
  });

  it('accepts file exactly at 5 MB boundary', () => {
    const edge = new File([new Uint8Array(AVATAR_MAX_BYTES)], 'edge.png', {
      type: 'image/png',
    });
    expect(() => validateAvatarFile(edge)).not.toThrow();
  });

  it('rejects image/gif', () => {
    const f = new File([new Uint8Array([1])], 'a.gif', { type: 'image/gif' });
    expect.assertions(1);
    try {
      validateAvatarFile(f);
    } catch (err) {
      expect((err as AvatarValidationError).code).toBe('unsupported_mime');
    }
  });

  it('rejects text/plain', () => {
    const f = new File(['hello'], 'a.txt', { type: 'text/plain' });
    expect.assertions(1);
    try {
      validateAvatarFile(f);
    } catch (err) {
      expect((err as AvatarValidationError).code).toBe('unsupported_mime');
    }
  });

  it('rejects filename without extension', () => {
    const f = new File([new Uint8Array([1])], 'avatar', { type: 'image/png' });
    expect.assertions(1);
    try {
      validateAvatarFile(f);
    } catch (err) {
      expect((err as AvatarValidationError).code).toBe('unsupported_ext');
    }
  });
});

// =============================================================
// buildAvatarObjectPath
// =============================================================

describe('M5-6 profile API — buildAvatarObjectPath', () => {
  it('produces <uid>/avatar-<unix>.<ext> with explicit timestamp', () => {
    const f = new File([new Uint8Array([1])], 'a.PNG', { type: 'image/png' });
    expect(buildAvatarObjectPath('uid-1', f, 1700000000000)).toBe(
      'uid-1/avatar-1700000000000.png',
    );
  });

  it.each([
    ['image/jpeg', 'jpg'],
    ['image/png', 'png'],
    ['image/webp', 'webp'],
    ['image/heic', 'heic'],
  ] as const)('maps MIME %s → ext %s', (mime, ext) => {
    const f = new File([new Uint8Array([1])], 'a.bin', { type: mime });
    expect(buildAvatarObjectPath('u', f, 1)).toBe(`u/avatar-1.${ext}`);
  });
});

// =============================================================
// uploadAvatar
// =============================================================

describe('M5-6 profile API — uploadAvatar', () => {
  it('happy path: list (purge) → upload → getPublicUrl → returns URL', async () => {
    const url = await uploadAvatar('uid-1', pngFile());
    expect(list).toHaveBeenCalledTimes(1);
    expect(list).toHaveBeenCalledWith('uid-1', { limit: 100 });
    expect(upload).toHaveBeenCalledTimes(1);
    const [path, file, opts] = upload.mock.calls[0];
    expect(path).toMatch(/^uid-1\/avatar-\d+\.png$/);
    expect(file).toBeInstanceOf(File);
    expect(opts).toEqual({ contentType: 'image/png', upsert: true });
    expect(getPublicUrl).toHaveBeenCalledWith(path);
    expect(url).toMatch(
      /^https:\/\/x\.supabase\.co\/storage\/v1\/object\/public\/avatars\/uid-1\/avatar-\d+\.png$/,
    );
  });

  it('purges existing files when list returns folder items', async () => {
    list.mockResolvedValueOnce({
      data: [{ name: 'avatar-old.png' }, { name: 'avatar-another.jpg' }],
      error: null,
    });
    await uploadAvatar('uid-1', pngFile());
    expect(remove).toHaveBeenCalledTimes(1);
    expect(remove.mock.calls[0]![0]).toEqual([
      'uid-1/avatar-old.png',
      'uid-1/avatar-another.jpg',
    ]);
  });

  it('throws validation error BEFORE any supabase call', async () => {
    await expect(
      uploadAvatar('uid-1', new File([], 'x.gif', { type: 'image/gif' })),
    ).rejects.toBeInstanceOf(AvatarValidationError);
    expect(upload).not.toHaveBeenCalled();
    expect(list).not.toHaveBeenCalled();
  });

  it('rethrows upload error', async () => {
    upload.mockResolvedValueOnce({
      data: null,
      error: new Error('storage quota exceeded'),
    });
    await expect(uploadAvatar('uid-1', pngFile())).rejects.toThrow(/quota/i);
  });

  it('tolerates list returning an error (best-effort purge)', async () => {
    list.mockResolvedValueOnce({ data: null, error: new Error('rate limited') });
    const url = await uploadAvatar('uid-1', pngFile());
    expect(url).toMatch(/^https:\/\/x/);
    expect(upload).toHaveBeenCalledTimes(1);
  });

  it('tolerates list throwing (best-effort purge)', async () => {
    list.mockRejectedValueOnce(new Error('network blip'));
    const url = await uploadAvatar('uid-1', pngFile());
    expect(url).toMatch(/^https:\/\/x/);
  });
});

// =============================================================
// deleteAvatar
// =============================================================

describe('M5-6 profile API — deleteAvatar', () => {
  it('PATCHes profiles.avatar_url=null FIRST, then best-effort storage purge', async () => {
    // deleteAvatar awaits immediately after .eq() — chain short-circuits.
    eq.mockImplementationOnce(() =>
      Promise.resolve({ data: [{ id: 'uid-1', avatar_url: null }], error: null }),
    );
    list.mockResolvedValueOnce({
      data: [{ name: 'avatar-1.png' }],
      error: null,
    });
    await deleteAvatar('uid-1');
    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0]![0]).toEqual({ avatar_url: null });
    expect(list).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledTimes(1);
    expect(remove.mock.calls[0][0]).toEqual(['uid-1/avatar-1.png']);
    // Order check: update.eq FIRST, then storage.list/remove.
    expect(update.mock.invocationCallOrder[0]!).toBeLessThan(
      list.mock.invocationCallOrder[0]!,
    );
  });

  it('throws DB error BEFORE attempting storage remove', async () => {
    eq.mockImplementationOnce(() =>
      Promise.resolve({ data: null, error: new Error('rls denied') }),
    );
    await expect(deleteAvatar('uid-x')).rejects.toThrow(/rls/);
    expect(list).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });

  it('does not throw on list/remove failure (best-effort)', async () => {
    eq.mockImplementationOnce(() => Promise.resolve({ data: null, error: null }));
    list.mockResolvedValueOnce({ data: null, error: new Error('list failed') });
    await expect(deleteAvatar('uid-x')).resolves.toBeUndefined();
  });
});

// =============================================================
// updateProfile
// =============================================================

describe('M5-6 profile API — updateProfile', () => {
  it('PATCHes only the fields provided and selects display_name, avatar_url', async () => {
    await updateProfile('uid-1', { display_name: 'New' });
    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0]![0]).toEqual({ display_name: 'New' });
    expect(eq).toHaveBeenCalledWith('id', 'uid-1');
    expect(select).toHaveBeenCalledWith('display_name, avatar_url');
    expect(single).toHaveBeenCalledTimes(1);
  });

  it('returns the parsed row', async () => {
    single.mockResolvedValueOnce({
      data: { display_name: 'New', avatar_url: null },
      error: null,
    });
    const res = await updateProfile('uid-1', { display_name: 'New' });
    expect(res).toEqual({ display_name: 'New', avatar_url: null });
  });

  it('forwards avatar_url null to PATCH', async () => {
    await updateProfile('uid-1', { avatar_url: null });
    expect(update.mock.calls[0]![0]).toEqual({ avatar_url: null });
  });
});

// =============================================================
// resolveAvatarPublicUrl
// =============================================================

describe('M5-6 profile API — resolveAvatarPublicUrl', () => {
  it('returns publicUrl from SDK', () => {
    expect(resolveAvatarPublicUrl('uid/a.png')).toBe(
      'https://x.supabase.co/storage/v1/object/public/avatars/uid/a.png',
    );
  });
});

// =============================================================
// Constants export sanity
// =============================================================

describe('M5-6 profile API — constants', () => {
  it('AVATAR_MAX_BYTES is 5 MB', () => {
    expect(AVATAR_MAX_BYTES).toBe(5 * 1024 * 1024);
  });
  it('AVATAR_ALLOWED_MIMES matches the avatar bucket policy', () => {
    expect([...AVATAR_ALLOWED_MIMES]).toEqual([
      'image/png',
      'image/jpeg',
      'image/heic',
      'image/webp',
    ]);
  });
});
