import { revalidatePath } from "next/cache";

import { auth } from "@/auth";

import { AuthorizationError, ValidationError, failure, type ActionResult } from "./action-result";
import { REVALIDATION_PATHS } from "./revalidate-paths";

export { AuthorizationError, ValidationError };

export async function getAuthenticatedUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id || null;
}

export async function requireAuthenticatedUserId(message = "Unauthorized"): Promise<string> {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    throw new AuthorizationError(message);
  }
  return userId;
}

/**
 * Reclassifies a repository `require(...)` rejection (a plain Error thrown
 * on a missing/not-owned entity) as an AuthorizationError, so
 * wishlistCommand surfaces its message instead of hiding it behind a
 * generic one.
 */
export async function requireOwned<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    throw new AuthorizationError(error instanceof Error ? error.message : "Not found");
  }
}

type RevalidationTarget = keyof typeof REVALIDATION_PATHS;

export interface WishlistCommandOptions {
  /** Named revalidation targets (see revalidate-paths.ts) to revalidate on success. */
  revalidate?: RevalidationTarget[];
  /** Shown for any error that isn't an AuthorizationError/ValidationError. */
  genericErrorMessage?: string;
}

/**
 * Wraps a server action body into one ActionResult<T> contract, replacing
 * four incompatible error conventions ({success,error} / {error} / throws /
 * null) that previously varied action by action.
 *
 * - AuthorizationError / ValidationError thrown by the handler surface their
 *   message to the client verbatim — they're already curated, safe text.
 * - Any other thrown value (a raw Error, a Prisma error, ...) is logged and
 *   hidden behind `genericErrorMessage`, so infrastructure failures never
 *   leak internals.
 * - On success, the named `revalidate` targets run before the result is
 *   returned.
 */
export function wishlistCommand<A extends unknown[], T>(
  handler: (...args: A) => Promise<T>,
  opts: WishlistCommandOptions = {},
): (...args: A) => Promise<ActionResult<T>> {
  return async (...args: A): Promise<ActionResult<T>> => {
    try {
      const data = await handler(...args);

      for (const target of opts.revalidate ?? []) {
        const { path, type } = REVALIDATION_PATHS[target];
        revalidatePath(path, type);
      }

      return { success: true, data } as ActionResult<T>;
    } catch (error) {
      if (error instanceof AuthorizationError || error instanceof ValidationError) {
        return failure(error.message);
      }

      console.error("wishlistCommand: unexpected error", error);
      return failure(opts.genericErrorMessage ?? "Something went wrong. Please try again.");
    }
  };
}
