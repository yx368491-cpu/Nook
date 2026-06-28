/** Maximum number of groups */
export const MAX_GROUPS = 4;

/** Maximum members per group (including the owner who created it) */
export const MAX_GROUP_MEMBERS = 8;

/** Maximum total friends (including all group members + 1:1 contacts) */
export const MAX_FRIENDS = 20;

/** Maximum file upload size in bytes (50 MB) */
export const MAX_FILE_SIZE = 50 * 1024 * 1024;

/** Maximum image upload size in bytes (50 MB) */
export const MAX_IMAGE_SIZE = 50 * 1024 * 1024;

/** Maximum avatar upload size in bytes (5 MB) */
export const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

/** Edit window in milliseconds (2 minutes) */
export const EDIT_WINDOW_MS = 2 * 60 * 1000;

/** Invite expiration in milliseconds (24 hours) */
export const INVITE_EXPIRY_MS = 24 * 60 * 60 * 1000;

/** Message TTL in days (30 days auto-delete) */
export const MESSAGE_TTL_DAYS = 30;
