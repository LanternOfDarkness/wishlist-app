// Letters, digits, and dashes only — matches the "Use letters, numbers, and
// dashes" help text shown next to the username field in Settings.
const USERNAME_PATTERN = /^[a-zA-Z0-9-]{3,30}$/;

// Top-level segments under `[locale]/` that a username would collide with,
// plus the locale codes themselves (a username equal to a locale would be
// ambiguous with `/[locale]` routing). Locale codes are duplicated from
// `src/i18n/routing.ts` rather than imported from it — that module wires up
// next-intl's `createNavigation`, which pulls in `next/navigation` and
// breaks outside a real Next.js runtime (e.g. under Vitest). Keep in sync
// with `routing.locales` if locales change.
const RESERVED_USERNAMES = new Set<string>([
  "dashboard",
  "login",
  "embed",
  "api",
  "en",
  "uk",
]);

export function isValidUsernameFormat(username: string): boolean {
  return USERNAME_PATTERN.test(username);
}

export function isReservedUsername(username: string): boolean {
  return RESERVED_USERNAMES.has(username.toLowerCase());
}

export function isValidUsername(username: string): boolean {
  return isValidUsernameFormat(username) && !isReservedUsername(username);
}
