export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

export function success<T>(data?: T): ActionResult<T> {
  return data !== undefined ? { success: true, data } : { success: true } as ActionResult<T>;
}

export function failure<T = never>(error: string): ActionResult<T> {
  return { success: false, error };
}

/**
 * Thrown for "you're not allowed to do this" — missing auth or ownership
 * denial. wishlistCommand surfaces its message to the client verbatim, since
 * callers only ever construct one with an already-curated, safe message
 * (e.g. "Unauthorized", "Item not found").
 */
export class AuthorizationError extends Error {}

/**
 * Thrown for expected, user-facing domain-rule failures (bad input, a
 * business rule that wasn't met). wishlistCommand surfaces its message to
 * the client verbatim — unlike an unclassified Error, which is hidden behind
 * a generic per-action message.
 */
export class ValidationError extends Error {}
