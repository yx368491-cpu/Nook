/**
 * Nook M5-6 · Profile API (avatars).
 *
 * Source of truth for self-avatar operations:
 * - SPEC § F-AUTH-09 (avatar URI ↔ public URL + reactive update)
 * - SPEC § AC.13 (cap-level)
 * - ARCH-DESIGN § 6.1 + CAP-17 (REST Storage `avatars/<path>` + profiles UPDATE)
 * - supabase/migrations/20260628000007_storage_buckets_and_rls.sql (RLS —
 *   bucket `public=true`, self-only write via `storage.foldername(name)=auth.uid()`)
 *
 * The avatars bucket is PUBLIC, so we store the **public URL** (not the
 * storage_path) in `profiles.avatar_url`. This matches the existing chat
 * Avatar consumers that pass the URL straight to <img src>. Trade-off:
 * bucket rename would orphan DB URLs (accepted for v1.0).
 *
 * Storage path convention: `avatars/<userId>/avatar-<unix-ms>.<ext>`.
 *   - Versioned (`avatar-<now>.`) so CDN edge cache is busted on update.
 *   - Leading `<userId>/` segment is enforced by bucket RLS
 *     (`storage.foldername(name)=auth.uid()::text`).
 *
 * Delete order matters: PATCH `profiles.avatar_url = null` FIRST so any
 * Avatar consumer falls back to initials immediately, then best-effort
 * storage remove of the user folder (cleanup-storage-orphans edge function
 * covers drift).
 */

import { supabase } from '@/lib/supabase';

// ============================================================
// Constants — mirror storage migration 07
// ============================================================

/** 5 MB — matches bucket `file_size_limit` on `avatars`. */
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

/** Whitelist — matches bucket `allowed_mime_types` on `avatars`. */
export const AVATAR_ALLOWED_MIMES = [
  'image/png',
  'image/jpeg',
  'image/heic',
  'image/webp',
] as const;

export type AvatarMime = (typeof AVATAR_ALLOWED_MIMES)[number];

/** Patch payload for `updateProfile`. Avatar can be cleared (`null`). */
export interface ProfilePatch {
  display_name?: string;
  avatar_url?: string | null;
}

export type AvatarValidationCode =
  | 'empty'
  | 'too_large'
  | 'unsupported_mime'
  | 'unsupported_ext';

export class AvatarValidationError extends Error {
  readonly code: AvatarValidationCode;
  constructor(code: AvatarValidationCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'AvatarValidationError';
  }
}

// ============================================================
// Pure helpers (exported for unit tests + pre-flight UX)
// ============================================================

function extForMime(mime: string): string {
  switch (mime.toLowerCase()) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/heic':
      return 'heic';
    default:
      return 'bin';
  }
}

/**
 * Validate an avatar File before any network call.
 * Throws `AvatarValidationError` on failure; returns void on success.
 * Defense in depth — also enforced server-side by bucket RLS + size cap.
 */
export function validateAvatarFile(file: File): asserts file is File {
  if (file.size === 0) {
    throw new AvatarValidationError('empty', 'Avatar file is empty');
  }
  if (file.size > AVATAR_MAX_BYTES) {
    throw new AvatarValidationError(
      'too_large',
      `Avatar file exceeds ${AVATAR_MAX_BYTES / 1024 / 1024} MB limit`,
    );
  }
  if (!AVATAR_ALLOWED_MIMES.includes(file.type as AvatarMime)) {
    throw new AvatarValidationError(
      'unsupported_mime',
      `Avatar MIME ${file.type || '(unknown)'} is not supported`,
    );
  }
  // Defensive — bucket policy will accept any name, but stable ext matters
  // for CDN content-type sniffing fallback.
  const lastDot = file.name.lastIndexOf('.');
  if (lastDot < 0 || lastDot === file.name.length - 1) {
    throw new AvatarValidationError(
      'unsupported_ext',
      'Avatar filename must have a file extension',
    );
  }
}

/**
 * Build avatar storage object name: `<userId>/avatar-<unix-ms>.<ext>`.
 * Versioned filename pattern — overrides break CDN edge caches.
 */
export function buildAvatarObjectPath(
  userId: string,
  file: File,
  now: number = Date.now(),
): string {
  return `${userId}/avatar-${now}.${extForMime(file.type)}`;
}

/**
 * Resolve a public URL for an avatar storage path. Uses the Supabase SDK
 * helper so URL composition is centralized.
 */
export function resolveAvatarPublicUrl(path: string): string {
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return data.publicUrl;
}

// ============================================================
// Best-effort folder purge (private)
// ============================================================

/**
 * Remove all existing avatar files in `<userId>/`. Best-effort —
 * individual failures are swallowed; orphan sweep is deferred to the
 * `cleanup-storage-orphans` Edge Function (project already shipped).
 */
async function purgeAvatarFolder(userId: string): Promise<void> {
  try {
    const { data: list, error: listErr } = await supabase.storage
      .from('avatars')
      .list(userId, { limit: 100 });
    if (listErr || !list) return;
    const targets = list
      .filter((o) => typeof o?.name === 'string' && !o.name.endsWith('/'))
      .map((o) => `${userId}/${o.name}`);
    if (targets.length === 0) return;
    await supabase.storage.from('avatars').remove(targets);
  } catch {
    // Best-effort. Storage cleanup tolerates failure.
  }
}

// ============================================================
// Public API
// ============================================================

/**
 * Upload an avatar for `userId`. Returns the public URL.
 * Sequence: validate → purge old files (best-effort) → upload → resolve URL.
 */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  validateAvatarFile(file);
  const path = buildAvatarObjectPath(userId, file);
  await purgeAvatarFolder(userId);
  // `upsert: true` is defensive: the filename is versioned
  // (`avatar-<unix-ms>.<ext>`) so collision is impossible in the happy path,
  // but a network-retry after a pre-purge race could land on the same name.
  // Supabase SDK requires upsert on retry to allow overwriting the empty slot.
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, file, { contentType: file.type, upsert: true });
  if (error) throw error;
  return resolveAvatarPublicUrl(path);
}

/**
 * Delete avatar for `userId`.
 *
 * ORDER MATTERS: PATCH `profiles.avatar_url = null` FIRST so any Avatar
 * consumer falls back to initials immediately (no flash of broken image),
 * then best-effort storage remove. Race-safe.
 */
export async function deleteAvatar(userId: string): Promise<void> {
  const { error: patchErr } = await supabase
    .from('profiles')
    .update({ avatar_url: null })
    .eq('id', userId);
  if (patchErr) throw patchErr;
  await purgeAvatarFolder(userId);
}

/**
 * Update profile fields (`display_name`, `avatar_url`). Returns the
 * updated `display_name` + `avatar_url` column subset.
 *
 * `display_name` is mapped from camelCase via the API edge — consumers
 * pass `{ display_name: 'X' }` (snake_case DB column convention) at this
 * layer; the `useAuth.updateProfile` wrapper translates camelCase keys.
 */
export async function updateProfile(
  userId: string,
  updates: ProfilePatch,
): Promise<{ display_name: string | null; avatar_url: string | null }> {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select('display_name, avatar_url')
    .single();
  if (error) throw error;
  return data as { display_name: string | null; avatar_url: string | null };
}
