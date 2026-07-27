# Plan: finish the repository seam and deepen the surrounding modules

Supersedes [`plan-repository-seam.md`](./plan-repository-seam.md), which was written 2026-05-22 and
predates the entire visibility model. Do not follow the old plan — its file tree is still broadly
right, but its interface, its "files to delete" list and its test strategy are all stale.

## Why the original stalled

The seam was built to plan through step 2 of 9, then stopped on 2026-05-23. Steps 3–9 never ran:

| Old plan step | State today |
|---|---|
| 1–2. `repository/` + Prisma adapter | done |
| 3. Migrate 7 action files | **1 of 7** — only `follow-user.ts` |
| 4. `wishlist-presentation.ts` to the seam | not started |
| 5. `auth.ts` **and** `dashboard/page.tsx` | half — `auth.ts` only |
| 6. Delete 3 superseded modules | none deleted |
| 7. Stop leaking `Prisma.ItemWhereInput` | still leaks (`wishlist-filter-state.ts:61,93`) |
| 8–9. Tests via the in-memory adapter | adapter has its own test; nothing else uses it |

Then PR1–PR5 landed on 2026-07-16..18 and added share tokens (Jul 16), archiving (Jul 17) and
owner-blind pledges (Jul 17) — all written directly against Prisma, around the seam. So the adapter
is not buggy so much as **frozen before those features existed**:

- `interface.ts` has no `isArchived`, no `shareToken`, no `isPublic`, no pledge commands.
- Its item shape (`interface.ts:46-51`) knows `isReserved` — from the original February schema — and
  nothing added since.
- `prisma-adapter.ts:39,78` therefore still carry the pre-`cb90faf` item filter, under green tests.

**The lesson to encode in the new plan: a seam that no production path crosses will drift.** Every
phase below ends with the seam carrying real traffic, not with more surface behind it.

## Ordering principle

Visibility first, because it decides what the repository interface has to express. Then the
repository. UI last, because it depends on both.

```
Phase 0  quick wins + guard rails      (independent)
Phase 1  Wishlist visibility module    (feeds Phase 2's interface)
Phase 2  appearance normalization      (feeds Phase 3's update-profile migration)
Phase 3  finish the seam + command shape
Phase 4  shared render module
Phase 5  settings form state
```

Phases 1–3 are the spine. 4 and 5 are independently shippable and can be deferred.

**Invariant for every phase:** `npm test` green (baseline **204 tests / 22 files**) and
`npm run build` clean at each phase boundary. Each phase is its own PR and is revertable alone.

---

## Phase 0 — Guard rails and quick wins

Nothing structural. Establishes the safety net the later phases lean on.

1. **Verify `npm run build` passes on `integrate/functionality-audit`.** The Next.js build is the
   only typecheck that catches server/client boundary violations, and Phases 3–4 move code across
   that boundary constantly. If it is already broken, fix that before anything else.
2. **Fix the share-key loss on filter reset.** [`wishlist-filters.tsx:201-207`](../src/components/wishlist-filters.tsx#L201)
   calls `router.push(pathname)`, dropping the whole query string including `k`. A share-link
   visitor to a private wishlist gets a 404 from the "Clear filters" button, because
   [`page.tsx:39`](../src/app/[locale]/[username]/page.tsx#L39) reads `shareKey` from exactly there.
   Preserve `k` (and only `k`). Three lines.
3. **Characterization tests for visibility, before Phase 1 moves it.** This is security-relevant
   logic with no single owner, so pin current behaviour first. Cover, against
   `getWishlistPresentation` and `createReservation`: owner sees private + archived-excluded;
   mutual follower sees private; stranger sees neither; valid `shareKey` opens a private wishlist;
   invalid `shareKey` does not; archived items never appear on page, embed or widget.
   Some of these already exist in `wishlist-presentation.test.ts` — extend, don't duplicate.

**Exit:** build green, 204+ tests green, share-key bug fixed.

---

## Phase 1 — One module owns Wishlist item visibility

The rule currently lives in seven places (`wishlist-filter-state.ts:62`,
`wishlist-presentation.ts:286,326,340,345`, `reservation.ts:67,75`, `prisma-adapter.ts:39,78`,
`in-memory-adapter.ts:40,72`, `dashboard-settings-intake.ts:49`) and they disagree.

### New module: `src/lib/wishlist-visibility.ts`

The critical design choice: **the module owns the rule, the adapter owns the translation.** The rule
is expressed as a plain domain value with no Prisma types, so both adapters — and the settings
intake — consume the identical decision.

```ts
export type ViewerRelationship = {
  isOwner: boolean; isFollowing: boolean;
  isMutualFollower: boolean; canViewPrivateItems: boolean;
};

export type WishlistAccess = {
  canViewWishlist: boolean;
  canViewPrivateItems: boolean;
};

/** What a given surface is allowed to show. No Prisma types. */
export type ItemVisibility = {
  includeArchived: boolean;   // false everywhere today
  includePrivate: boolean;
  widgetOnly: boolean;        // embed + widget picker
};

export function getViewerRelationship(user, viewerUserId?): ViewerRelationship;
export function resolveWishlistAccess(args: {
  wishlist: { isPublic: boolean; shareToken: string | null };
  relationship: ViewerRelationship;
  shareKey?: string | null;
}): WishlistAccess;
export function itemVisibilityFor(
  surface: "wishlist-page" | "embed" | "widget-picker" | "dashboard",
  access: WishlistAccess,
): ItemVisibility;
```

`getViewerRelationship` and `matchesShareToken` move here from `wishlist-presentation.ts:121,147`
(re-export from their old home for one phase to keep the diff small, then drop the re-export).

### Steps

1. Create the module with the four functions; unit-test each surface × relationship combination.
   This is pure logic in `src/lib`, so it is fully testable under the existing node environment.
2. Rewrite `wishlist-filter-state.ts:58-89` to take an `ItemVisibility` instead of a bare
   `canViewPrivateItems` boolean. It still returns `Prisma.ItemWhereInput` for now — Phase 3
   moves that translation behind the adapter.
3. Point `wishlist-presentation.ts` (both entry points) and `reservation.ts:67-86` at the module.
   `reservation.ts`'s hand-copied gate becomes one `resolveWishlistAccess` call, and the comment at
   `reservation.ts:29-35` claiming it "mirrors" the page gate stops being an unenforced promise.
4. Give `dashboard-settings-intake.ts:49` a `where` derived from `itemVisibilityFor("dashboard", …)`.
   This is a real leak fix: it currently serializes archived items to the browser, and they show up
   in the widget picker at `embed-widget.tsx:215`.
5. Leave the repository adapters alone this phase — Phase 3 rewrites them wholesale.

**Exit:** exactly one definition of each visibility rule outside `src/lib/repository/`. Phase 0's
characterization tests still green, unchanged.

---

## Phase 2 — One home for appearance normalization

Independent of the seam, but must precede Phase 3's `update-profile` migration so that migration has
a single clean entry point to call.

Today the same eight rules exist in three or four modules and have drifted:
`readBoolean` accepts `"on"` in `wishlist-appearance.ts:416` but not in
`wishlist-settings-state.ts:105`; `getString` trims in `wishlist-appearance.ts:411` and in none of
the other three copies; `font` and `itemBorder` are validated **twice on read** and **zero times on
write**.

### Steps

1. Add one validated write entry point to the already-deep `wishlist-appearance.ts`:
   `parseWishlistAppearance(input: unknown): WishlistAppearance` — allow-lists every field,
   including `font` and `itemBorder`, which nothing validates on write today.
2. Delete `wishlist-appearance-form.ts` (83 lines, one caller). Its "FormData must carry every key
   or stored values are wiped" invariant (`:74-77`) moves next to the write it governs.
   Keep its unknown-key preservation (`:64`) — that is load-bearing, it is the only reason
   `updateProfile` does not clobber `widgetLayout` written by a different action. Keep its legacy
   colour migration (`:57-59`) as an explicitly named function, not a side effect of "build".
3. Collapse `wishlist-settings-state.ts` into `wishlist-appearance.ts`. Five of its eight exports
   are pure re-exports; `shouldUseDarkTheme`, `ThemeMode` and the returned `rawAppearance` field are
   dead. `settings-form.tsx` currently imports the same constants from both modules (`:17` vs
   `:18-27`) — that second import path disappears.
4. Delete the read-side duplicates in `wishlist-presentation.ts:31-113` in favour of the single
   parse. Once appearance is validated on write, readers stop re-validating.
5. Decide `themeMode`: it round-trips form → DB and is read by no renderer. Either wire it or drop
   it. Do not leave it.

**Exit:** one allow-list per appearance field; `npm test` green; the `"on"` and trimming divergences
are gone by construction.

---

## Phase 3 — Finish the seam, and give commands one shape

The spine. Folds old candidate 05 (command shape) into the migration, because every action gets
rewritten here anyway — doing them separately means touching all 9 files twice.

### 3a. Teach the interface the July features

Add to `interface.ts` / `types.ts`, all currently absent:

- `Item.isArchived` on every item shape.
- `Wishlist.isPublic` and `shareToken` on the presentation specs.
- `LoadSpec`: `item-for-reservation` (item + wishlist + owner follows, the shape
  `reservation.ts:42-65` already fetches).
- `WriteCommand`: `update-item`, `delete-item`, `set-item-archived`, `create-pledge`,
  `regenerate-share-token`, `revoke-share-token`.
- Replace the `canViewPrivate: boolean` on the `wishlist-presentation` spec with Phase 1's
  `ItemVisibility`. **Both adapters translate the same value** — this is what stops them drifting
  again.
- Name the inline result shape at `interface.ts:44-53`; every sibling uses a named type from
  `types.ts`.

Drop, rather than implement: `create-wishlist` (`interface.ts:34`) — the action was removed in
`85d99d0` and nothing calls it.

Fix while here: `execute<T = unknown>` forces callers to cast, and both adapters type `load`/`execute`
as `Promise<any>` internally (`prisma-adapter.ts:9,221`), which erases `SpecResultMap` at exactly the
point it would catch a mistake. Type the switch returns properly.

### 3b. Make the second adapter load-bearing

This is the payoff, and the thing whose absence caused the drift.

1. Write a **shared conformance suite** — one set of assertions, run against both adapters.
   The in-memory adapter runs it in CI unconditionally; the Prisma adapter runs it against the
   `docker-compose.yml` database, gated behind an env var so the default `npm test` stays fast
   (current suite: 3.7s). A rule that holds for one adapter and not the other now fails a test
   instead of shipping.
2. Replace `vi.mock("@/lib/prisma")` with `setTestRepository(new InMemoryWishlistRepository())` in
   the 7 action test files that currently mock the module directly. Those tests assert Prisma call
   shapes today (`follow-user.test.ts:73-77`); they become behavioural.
   `setTestRepository` (`index.ts:13`) has zero callers today — this is what it was built for.
3. Delete `in-memory-adapter.test.ts`'s duplicated coverage once the conformance suite subsumes it,
   including the assertions that currently pin the archived-leak behaviour green.

### 3c. Migrate the 9 remaining DB-touching actions

`add-item`, `update-item`, `delete-item`, `archive-item`, `reserve-item`, `update-profile`,
`update-widget-settings`, `update-widget-items`, `wishlist-visibility` (×2).

Introduce the command wrapper as part of this, since each file is being rewritten regardless:

```ts
// src/lib/wishlist-command.ts
export function wishlistCommand<A extends unknown[], T>(
  handler: (ctx: CommandContext, ...args: A) => Promise<T>,
  opts: { revalidate?: RevalidationTarget[] },
): (...args: A) => Promise<ActionResult<T>>;
```

This resolves, in one move, four things the review flagged:

- **Four incompatible error conventions** (`{success,error}` / `{error}` / throws / `null`) become
  one `ActionResult<T>`. `failure()` in `action-result.ts:9` currently has zero call sites.
- **The copy-pasted preamble** — `requireAuthenticatedUserId` + `requireOwnedWishlistItem`, byte
  identical in `delete-item.ts:11` and `archive-item.ts:11`, and outside the `try` in
  `update-widget-items.ts:30`.
- **`revalidatePath('/[locale]/[username]', 'page')` as a raw literal in 8 files**, while
  `src/lib/revalidate-paths.ts` defines exactly those constants and has zero importers.
- **The catch-all that swallows authorization.** `deleteItem`'s auth failure currently surfaces as
  `"Failed to delete item"` — asserted green at `item-mutations.test.ts:87-90`. Distinguish
  auth/validation/infrastructure failures at the wrapper. This deliberately changes those test
  expectations; update them, do not preserve the behaviour.

Then delete `add-item.ts:18-21`'s `KNOWN_ERROR_MESSAGES` set, which string-matches errors thrown two
modules away and which `update-item.ts` lacks — the reason the same validation error degrades to a
generic failure on the edit path.

### 3d. Migrate the read paths and retire the bypasses

- `wishlist-presentation.ts` → both entry points load through the seam.
- `dashboard/page.tsx:18` → `load({ type: "dashboard-user" })`; narrow the select, it currently ships
  the full `User` row plus 7 unused item fields to the browser.
- `dashboard-settings-intake.ts` → **keep**, contrary to the old plan's step 7. It holds
  `DASHBOARD_SETTINGS_ITEM_SELECT`, the one place deciding what is serialized to the client, and its
  type is consumed by two client components. Re-point its body at the repository instead of deleting
  it. Also remove `settings-form.tsx:29`'s hand-rolled competing `UserWithWishlist` type.
- `wishlist-command-context.ts` → delete once empty. Its `require*` helpers become `require` specs;
  `countSelectedWidgetItems(userId, client)` takes a `Prisma.TransactionClient` in its public
  signature (`:95`), so the 5-item widget cap must move behind a transactional repository command.
- `wishlist-item-intake-command.ts` → delete; folds into `execute({ type: "add-item" })`. Keep
  `wishlist-item-intake.ts`, which carries real normalization rules and passes the deletion test.
  Its category-create branch (`:19-21`) duplicates `prisma-adapter.ts:241-246`; keep one.
- `wishlist-filter-state.ts` → stop exporting `Prisma.ItemWhereInput` (old plan step 7). URL codec
  stays; the `where`/`orderBy` construction moves into the Prisma adapter.

### 3e. Close the leaks

`@prisma/client` currently reaches 3 client components — `add-item-modal.tsx:22`,
`item-actions-menu.tsx:7`, `settings-form.tsx:13`. Replace with the seam's own types in `types.ts`,
which exist as a parallel vocabulary that only one file consumes today
(`wishlist-filters.tsx:6`).

**Exit:** `getRepository()` is the only route to Prisma outside `src/lib/repository/` and
`src/lib/prisma.ts`. Conformance suite green on both adapters. No `vi.mock("@/lib/prisma")` remains.
`grep -rn '@prisma/client' src --include=*.tsx` returns nothing.

---

## Phase 4 — One render module for both wishlist surfaces

`[username]/page.tsx` (313 lines) and `embed/[username]/page.tsx` (177) hand-draw the same wishlist.
Six blocks are near-verbatim copies — null guard, appearance unwrap, theme style, banner, avatar
`isSafeUrl`, item image `isSafeUrl` — and two have drifted:

- `[username]:234` renders price on truthiness (`item.price &&`), `embed:159` on null-check
  (`item.price != null`). An item priced `0` shows "0.00 UAH" in the widget and no price line on the
  profile page.
- `[username]:168` guards `primaryColor` before interpolating; `embed:131` does not.

Extract shared components (item card, banner, avatar, price) into `src/components/wishlist/`. Both
routes become thin. Collapse `wishlist-presentation.ts`'s 15 exports to its 2 real entry points —
11 of them exist only so the test file can reach them, and `itemWhere` (`:306`) is returned from the
production interface for exactly one consumer, the test at `:234`.

Worth noting: **6 of the 8 `isSafeUrl()` call sites in the repo are in these two files**, i.e. the
XSS guard from `c3e3198` is enforced entirely in JSX no test can reach. Moving the guard into a
shared component under `src/lib`/`src/components` is what makes it testable without adding a
renderer.

---

## Phase 5 — Settings form state

`settings-form.tsx` is 532 lines, the highest-churn file in the repo: 12 `useState`, 0 `useEffect`,
and two competing state disciplines (6 fields controlled + mirrored into hidden inputs, 6
uncontrolled via `defaultValue`). Phase 2 gave the lib the initial-value normalization; this phase
moves the **transition** rules — what happens when a value changes — behind the same module, where
the node-environment test suite can reach them.

Bugs that live in that gap:

- `resolveAdvancedColors` (`wishlist-appearance.ts:319-342`) silently discards the user's colours
  when contrast < 4.5, and the form still fires `toast.success`. `getContrastRatio` is exported and
  tested and called from no UI.
- Changing a preset never re-seeds the advanced colour pickers — there is no `useEffect` in the file
  — and stale values are pushed on every save via always-present hidden inputs (`:363-377`).
- Switching tabs unmounts one `SettingsForm` and mounts another (`settings-tabs.tsx:43-48`),
  resetting all 12 state values silently.
- `updateWidgetSettings`'s result is discarded (`use-update-widget-settings.ts:9-12`) and the widget
  item-cap error is swallowed (`embed-widget.tsx:68-74`), so both failures leave the UI showing
  success.

**Constraint:** `vitest.config.ts` pins `environment: 'node'` with no jsdom and no
`@testing-library`, and coverage includes only `src/actions` and `src/lib`. Moving logic into
`src/lib` is the only way it gets tested without adding a renderer. That is the phase's whole point —
decide deliberately whether to add a component-test setup instead, but do not leave it implicit.

Also delete `src/lib/hooks/use-theme.ts` — dead; every `useTheme` import in the repo comes from
`next-themes`.

---

## Risks

| Risk | Mitigation |
|---|---|
| Phase 3 is large and touches auth-adjacent code | Phase 0's characterization tests + the conformance suite are the net. Split 3a–3e into separate PRs. |
| The seam drifts again after this | 3b is the structural answer: the second adapter carries real test traffic, so a divergence fails CI instead of shipping. Do not skip it — skipping it is what produced today's state. |
| Error-shape unification changes user-visible strings | Deliberate. `deleteItem`'s "Failed to delete item" for an auth failure is a bug, not a contract. Update the tests that pin it. |
| Prisma adapter conformance needs a live DB | Gate behind an env var; `docker-compose.yml` already provides the database. Keep default `npm test` at ~4s. |
| `docs/plan-repository-seam.md` misleads a future reader | Mark it superseded in Phase 0, pointing here. |

## Follow-ups, not in scope

- `CONTEXT.md` gains **Wishlist visibility rule** (Phase 1) and **Wishlist command** (Phase 3) once
  those modules are named and stable.
- Consider an ADR recording *why* the repository seam exists and the rule that every spec must have a
  production caller — the constraint whose absence caused the drift. The repo has no `docs/adr/` yet.
