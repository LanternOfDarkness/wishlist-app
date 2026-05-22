export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

export function success<T>(data?: T): ActionResult<T> {
  return data !== undefined ? { success: true, data } : { success: true } as ActionResult<T>;
}

export function failure(error: string): ActionResult {
  return { success: false, error };
}
