import { corsHeaders } from './cors.ts';

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * 200 OK — success response.
 */
export function ok<T>(data: T): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * 201 Created — resource created successfully.
 */
export function created<T>(data: T): Response {
  return new Response(JSON.stringify(data), {
    status: 201,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * 400 Bad Request — validation / client error.
 */
export function badRequest(code: string, message: string, details?: Record<string, unknown>): Response {
  return new Response(JSON.stringify({ error: { code, message, details } } satisfies ApiErrorBody), {
    status: 400,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * 401 Unauthorized — missing or invalid JWT.
 */
export function unauthorized(message = 'Unauthorized'): Response {
  return new Response(JSON.stringify({ error: { code: 'E_AUTH_UNAUTHORIZED', message } } satisfies ApiErrorBody), {
    status: 401,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * 403 Forbidden — authenticated but insufficient permissions.
 */
export function forbidden(message = 'Forbidden'): Response {
  return new Response(JSON.stringify({ error: { code: 'E_AUTH_FORBIDDEN', message } } satisfies ApiErrorBody), {
    status: 403,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * 404 Not Found.
 */
export function notFound(message = 'Not found'): Response {
  return new Response(JSON.stringify({ error: { code: 'E_RES_NOT_FOUND', message } } satisfies ApiErrorBody), {
    status: 404,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * 410 Gone — resource expired or no longer available.
 */
export function gone(code: string, message: string): Response {
  return new Response(JSON.stringify({ error: { code, message } } satisfies ApiErrorBody), {
    status: 410,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * 409 Conflict — business rule conflict (e.g., already a member, full conversation).
 */
export function conflict(code: string, message: string): Response {
  return new Response(JSON.stringify({ error: { code, message } } satisfies ApiErrorBody), {
    status: 409,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * 500 Internal Server Error — unexpected errors.
 */
export function internalError(message = 'Internal server error'): Response {
  return new Response(JSON.stringify({ error: { code: 'E_SYS_INTERNAL', message } } satisfies ApiErrorBody), {
    status: 500,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
