import type { PostgrestError } from '@supabase/supabase-js';

export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'INVALID_CREDENTIALS'
  | 'SESSION_EXPIRED'
  | 'EDIT_WINDOW_EXPIRED'
  | 'GROUP_LIMIT_REACHED'
  | 'MEMBER_LIMIT_REACHED'
  | 'FILE_TOO_LARGE'
  | 'INVALID_EMAIL'
  | 'NOT_FOUND'
  | 'ALREADY_USED'
  | 'INVITE_EXPIRED'
  | 'ALREADY_MEMBER'
  | 'INTERNAL'
  | 'RATE_LIMIT'
  | 'DB_ERROR'
  | 'STORAGE_FULL';

export interface AppError {
  code: ErrorCode;
  message: string;
  details?: string;
}

const errorCodeMap: Record<string, ErrorCode> = {
  '23505': 'ALREADY_USED',
  '23503': 'NOT_FOUND',
  '42501': 'FORBIDDEN',
  'P0001': 'EDIT_WINDOW_EXPIRED',
};

export function mapSupabaseError(error: PostgrestError | null): AppError | null {
  if (!error) return null;

  const code = errorCodeMap[error.code] ?? 'INTERNAL';
  return {
    code,
    message: error.message,
    details: error.details,
  };
}

export function mapAuthError(error: { code?: string; message: string } | null): AppError | null {
  if (!error) return null;

  switch (error.code) {
    case 'invalid_credentials':
      return { code: 'INVALID_CREDENTIALS', message: error.message };
    case 'session_expired':
      return { code: 'SESSION_EXPIRED', message: error.message };
    default:
      return { code: 'INTERNAL', message: error.message };
  }
}
