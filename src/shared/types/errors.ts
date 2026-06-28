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
