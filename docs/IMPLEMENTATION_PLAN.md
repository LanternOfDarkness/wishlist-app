# Wishlist App — Implementation Plan

_Derived from `docs/AUDIT.md` (2026-07-16). Structured as a sequence of reviewable PRs, each on its own feature branch, with files to change, schema/migrations, tests, and acceptance criteria._

**Conventions used throughout**
- One PR = one feature branch off the default branch (matches the existing `feature/*` / `codex/*` flow).
- Every new mutation reuses the ownership gateway in `src/lib/wishlist-command-context.ts` (`requireAuthenticatedUserId`, `requireOwnedWishlistItem`, etc.) — do **not** hand-roll auth checks.
- Every action returns the existing `{ success: true, ... } | { success: false, error }` shape (see `src/actions/add-item.ts`) rather than throwing raw errors to the client.
- Each schema change ships with a Prisma migration (`npx prisma migrate dev --name <name>`) and regenerated client.
- Add tests in `src/**/__tests__/` (Vitest) and broaden coverage as noted.

**Sequencing (dependency order)**

| PR | Title | Priority | Depends on |
|----|-------|----------|-----------|
| 1 | Harden metadata scraper (SSRF + auth) | P0 | — |
| 2 | Enforce `isPublic` visibility | P0 | — |
| 3 | Item edit / delete / archive | P1 | — |
| 4 | Reservations & pledges end-to-end | P1 | 3 (shares item mutation patterns) |
| 5 | Testing & schema hardening (indexes, authz tests) | P2 | 1–4 land first |
| 6+ | P2/P3 polish (outlined) | P2/P3 | — |

PRs 1, 2, 3 are independent and can go in parallel. PR 4 builds on 3's patterns. PR 5's index changes can actually ship early; its tests should cover whatever has landed.

---

## PR 1 — Harden the metadata scraper (SSRF + auth) 🔴 P0

**Branch:** `fix/fetch-metadata-ssrf`
**Fixes:** Audit C1.

**Problem.** `src/actions/fetch-metadata.ts` has no auth check and only validates the URL protocol, allowing any anonymous visitor to make the server fetch internal hosts (`169.254.169.254`, `localhost`, private ranges) with redirect-following.

**Files**
- `src/actions/fetch-metadata.ts` (main change)
- `src/lib/utils.ts` — extend/add a URL-safety helper (there's already `isSafeUrl` for http/https gating; add a private-address guard beside it or a new `src/lib/safe-fetch.ts`).
- `src/actions/__tests__/fetch-metadata.test.ts` (existing) — add SSRF cases.

**Steps**
1. **Require auth.** At the top of `fetchMetadata`, call `await requireAuthenticatedUserId()` (or `getAuthenticatedUserId()` + early `null` return to keep the current signature). This alone closes anonymous access.
2. **Block private targets.** In `parseHttpUrl`, after protocol validation:
   - Reject non-`http:`/`https:` (already partially done — tighten to an exact set, not `startsWith('http')` which also allows `httpfoo:`).
   - Resolve the hostname with `dns.promises.lookup(host, { all: true })` and reject if **any** resolved address is loopback / private / link-local / unique-local / `0.0.0.0` / `::`. Cover IPv4 (`10/8`, `172.16/12`, `192.168/16`, `127/8`, `169.254/16`) and IPv6 (`::1`, `fc00::/7`, `fe80::/10`, IPv4-mapped).
   - Also reject literal-IP hosts that fall in those ranges before DNS (defense in depth).
3. **Disable redirect-following.** Pass `redirect: "manual"` to `fetch`; if a `3xx` with a `Location` comes back, re-run the full validation on the target and cap the number of hops (e.g. ≤3). Simplest safe option: treat any redirect as "resolve `Location`, re-validate, refetch once" or reject redirects outright.
4. Keep the 10s `AbortController` timeout and the spoofed User-Agent.
5. Return a **typed error reason** instead of collapsing everything to `null` (see Audit L2) so the client can distinguish "blocked URL" from "network error".

**Tests (add to `fetch-metadata.test.ts`)**
- `http://169.254.169.254/...` → rejected.
- `http://localhost:3000`, `http://127.0.0.1`, `http://[::1]` → rejected.
- `http://10.0.0.5`, `http://192.168.1.1` → rejected.
- A public URL that 302-redirects to `http://localhost` → rejected.
- `ftp://…`, `file://…`, `httpx://…` → rejected.
- Existing happy-path metadata extraction still passes (mock `fetch`/DNS).

**Acceptance criteria**
- Unauthenticated call returns an auth error and performs **no** outbound fetch.
- No request is ever issued to a private/loopback/link-local address, directly or via redirect.
- `npm test` green; new SSRF cases present.

---

## PR 2 — Enforce `isPublic` visibility 🟠 P0

**Branch:** `fix/enforce-wishlist-visibility`
**Fixes:** Audit H1 (+ closes the H2 leak).

**Problem.** `Wishlist.isPublic` (`prisma/schema.prisma:71`) is read nowhere. A private wishlist still fully renders on `/[username]` and in the embed widget.

**Decision (confirmed by owner):** keep & enforce. Not everyone wants a public wishlist. A non-public list must stay accessible to **friends (mutual followers)** and **by direct link**.

> **Open sub-question to resolve before PR 2 coding:** "accessible by link" is a *third* mode, distinct from "friends-only". Two clean options:
> - **(a) Two states** — `isPublic` true (listed/public) vs false (only owner + mutual followers; a bare link 404s for everyone else). Simplest, but "share by link with a non-friend" is impossible.
> - **(b) Three states / share token (recommended for the stated intent)** — `public` (anyone), `unlisted` (anyone **with the link/share token**, not discoverable), `private` (owner + mutual followers only). Needs a `visibility` enum (or a `shareToken` column) on `Wishlist` and a share-link URL like `/[username]?k=<token>`.
> Because the owner explicitly wants "by link" access, option (b) is the likely target — confirm before implementing. Everything else in PR 2 (enforcement points, tests) stays the same; only the predicate changes.

**Files**
- `src/lib/wishlist-presentation.ts` — both `getWishlistPresentation` and `getEmbedWishlistPresentation`.
- `src/app/[locale]/[username]/page.tsx` and `src/app/[locale]/embed/[username]/page.tsx` — handle the new "not viewable" result (call `notFound()`).
- `src/lib/__tests__/wishlist-presentation.test.ts` — add visibility cases.

**Steps**
1. In `getWishlistPresentation`, after loading the wishlist and computing `relationship` (line ~85), add: if `wishlist.isPublic === false` **and** `!relationship.canViewPrivateItems`, return `null` (pages already treat `null` as `notFound()`). Reuse the existing `getViewerRelationship` result — no new query.
2. In `getEmbedWishlistPresentation`, load `isPublic` and return `null` when the list is private (embeds have no viewer identity, so private ⇒ never embeddable). This also closes the H2 embed leak.
3. Ensure `isPublic` is actually settable — confirm the settings General tab writes it (`update-profile.ts`); if not, add a toggle there in the same PR so the field isn't write-only.

**Tests**
- Public list → visible to anonymous viewer.
- Private list → `null` for anonymous and non-follower; visible for owner and mutual follower.
- Private list → embed returns `null`.

**Acceptance criteria**
- A private wishlist 404s for non-authorized viewers on both the page and the embed.
- Owner and mutual followers still see it.
- No extra DB round-trips added.

---

## PR 3 — Item edit / delete / archive 🟢→ P1

**Branch:** `feature/item-crud`
**Implements:** Notion #46 (edit), #48 (delete), #49 (archive). Fixes Audit M3.

**Problem.** Items can only be created. There is no edit, delete, or archive path.

**Schema**
- Add `isArchived Boolean @default(false)` to `Item` (`prisma/schema.prisma`).
- Migration: `add_item_archive`.
- While here, add the FK indexes from Audit M4 (can also live in PR 5 — pick one): `@@index([wishlistId])`, `@@index([categoryId])` on `Item`.

**New server actions (`src/actions/`)**
- `update-item.ts` → `updateItem(itemId, data)`: `requireAuthenticatedUserId` → `requireOwnedWishlistItem(itemId, userId)` → normalize via the existing `normalizeWishlistItemIntake` (`src/lib/wishlist-item-intake.ts`) → `prisma.item.update`. Reuse the intake normalizer so edit and add share validation.
- `delete-item.ts` → `deleteItem(itemId)`: ownership check → `prisma.item.delete`.
- `archive-item.ts` → `setItemArchived(itemId, archived)`: ownership check → update `isArchived`. (Or fold into `updateItem`.)
- All three `revalidatePath('/[locale]/[username]', 'page')` and return the standard result shape.

**Read side**
- Exclude archived items from the public view by default: add `isArchived: false` to `buildWishlistItemWhere` in `src/lib/wishlist-filter-state.ts` (owner may get an "archived" filter view later).

**UI**
- Owner-only controls on the item card in `src/app/[locale]/[username]/page.tsx` (edit ✎ / delete 🗑 / archive) — gate on `relationship.isOwner`.
- Reuse `add-item-modal.tsx` as an edit modal (pass an existing item as initial state) rather than building a second form.
- Confirm-on-delete dialog (radix alert-dialog already available).

**Tests**
- `updateItem`/`deleteItem`/`setItemArchived`: reject when caller doesn't own the item (the untested authz path — Audit §4).
- `buildWishlistItemWhere` excludes archived items.
- Edit normalizes name/price/priority the same as add.

**Acceptance criteria**
- Owner can edit, delete, and archive items; non-owners get an authorization error.
- Archived items disappear from the public list but remain in the DB.
- `npm test` green.

---

## PR 4 — Reservations & pledges end-to-end 🟢→ P1

**Branch:** `feature/reservations`
**Implements:** Notion #15 (Pledge model), #16 (Booking UI), #17 (Guest form), #18 (progress). Fixes Audit M1. The app's differentiator — currently dead schema.

**Problem.** `Item.isReserved` renders a badge but is never set; the `Pledge` model is unreferenced. No reservation write path exists (so no race *yet* — build it race-safe from the start).

**Decision (confirmed by owner): full surprise preservation.** The wishlist owner must **not** be able to see *who* reserved an item **or that anything was reserved at all**. Implications, to bake into the design:
- The reserved/pledged state and the existing "reserved" badge (`[username]/page.tsx:233`) must be rendered **only when `!relationship.isOwner`**. The owner sees their list exactly as if nothing were reserved.
- Reservation/pledge data (`isReserved`, `Pledge` rows, `pledgedTotal`, progress bar) must be stripped from the presentation payload for the owner in `getWishlistPresentation` — not just hidden in the UI (don't ship it to the client at all).
- Reserver identity is never exposed to the owner regardless of `isAnonymous` (anonymous only affects what *other viewers* see).
- Add a test asserting the owner's presentation payload contains no reservation/pledge fields.

**Schema (`prisma/schema.prisma`)**
- `Pledge` already exists. Add what the flow needs:
  - `Pledge.status` or keep it implicit; add `@@index([itemId])` and `@@index([userId])` (Audit M4).
  - For **full** (single-person) reservations, prevent double-booking with a partial unique constraint. Prisma can't express partial uniques directly — use a raw-SQL migration: `CREATE UNIQUE INDEX one_full_reservation_per_item ON "Pledge"("itemId") WHERE status = 'FULL';` (or gate on `isReserved`).
  - For **partial** pledges (group gifting, #18), items can have many pledges summing toward `price`.
- Migration: `add_pledge_indexes_and_reservation_guard`.

**New server action `src/actions/reserve-item.ts`**
- `reserveItem({ itemId, mode: 'full' | 'partial', amount?, message?, guestName?, isAnonymous? })`.
- **Auth is optional here** (guests can pledge, #17) — but validate input carefully and rate-limit-friendly.
- **Race safety:** wrap in `prisma.$transaction`. For full reservation, do a conditional update: `updateMany({ where: { id: itemId, isReserved: false }, data: { isReserved: true } })` and treat `count === 0` as "already reserved" — this is the atomic guard that closes the reservation race (analogous to Audit M5's fix pattern). Then create the `Pledge`.
- `revalidatePath` the profile page.

**Read side / progress (#18)**
- Extend the presentation to compute, per item, `pledgedTotal = sum(pledges.amount)` and expose a progress ratio vs `item.price`. Add to `getWishlistPresentation`'s item include (`_count`/aggregate or include `pledges`).

**UI**
- "Reserve" / "Contribute" button on the item card (`[username]/page.tsx`) for non-owners.
- Guest modal (#17): name + amount/mode, or "reserve fully". Owner should **not** see who reserved if `isAnonymous` (surprise-preservation) — decide reveal rules.
- Progress bar component (#18) for partial-gift items.

**Tests**
- Two concurrent full reservations of the same item → exactly one succeeds (simulate by calling the conditional update twice).
- Partial pledges accumulate; progress ratio correct.
- Guest (unauthenticated) pledge allowed; input validated.

**Acceptance criteria**
- An item can be reserved fully (once) or contributed to partially; the badge/progress reflect state.
- Concurrent full-reservation attempts never double-book.
- Anonymous pledges hide identity per the agreed reveal rules.

---

## PR 5 — Testing & schema hardening 🟡 P2

**Branch:** `chore/test-and-index-hardening`
**Fixes:** Audit M4, M5, L1, §4.

- **FK indexes** (if not already added in PRs 3/4): `Item.wishlistId`, `Item.categoryId`, `Follows.followingId`, `Pledge.itemId`, `Pledge.userId`, `Category.userId`. One migration.
- **Widget TOCTOU (M5):** replace count-then-update in `src/actions/update-widget-items.ts` with a transactional check or a conditional update so the 5-item cap can't be exceeded concurrently.
- **Username validation (L1):** in `src/actions/update-profile.ts`, validate format (length, allowed chars) and reject reserved words (`dashboard`, `login`, `embed`, `api`, locale codes). Add a shared `isValidUsername` helper.
- **Broaden coverage:** change `vitest.config.ts` coverage `include` to cover all of `src/actions/**`, and add the authz tests that were missing (ownership rejection for every mutating action).
- **Error clarity (L2):** stop flattening authz-denial vs infrastructure errors in `add-item.ts` / `fetch-metadata.ts` — return distinct reasons.

**Acceptance:** indexes present in migration; widget cap race-safe; invalid/reserved usernames rejected; coverage report includes actions; authz tests green.

---

## P2 / P3 — Outlined (plan in detail when scheduled)

**Dead-code cleanup (P2, quick win).** Remove `src/actions/create-wishlist.ts` and `src/components/create-wishlist-modal.tsx` (Audit M2 — structurally broken, imported nowhere). Consolidate the duplicated wishlist auto-create logic (`src/auth.ts` `createUser` event vs `dashboard/page.tsx`, Audit L6) into one helper with a single source-of-truth title. Branch: `chore/remove-dead-wishlist-creation`.

**Dark mode (P2, Notion #51).** `next-themes` is installed but only used by `sonner.tsx`. Add a `ThemeProvider` in `src/app/[locale]/layout.tsx`, a toggle in the header, and reconcile with the existing appearance "theme mode" so a user's list theme and the app chrome theme don't conflict. Branch: `feature/dark-mode`.

**404 page (P2, Notion #36).** Add `src/app/[locale]/not-found.tsx` (and/or a root `not-found.tsx`) wired to next-intl. Branch: `feature/not-found-page`.

**Avatar upload (P2, Notion #45).** Settings General tab currently only takes name/username. Add image upload (needs a storage decision — e.g. UploadThing / S3 / Supabase Storage) and wire `User.image`; update `next.config.ts` `images.remotePatterns` for the chosen host. Branch: `feature/avatar-upload`.

**Landing sections (P2, Notion #19/#20/#21).** Flesh out Hero / Features / Footer on the landing page. Branch: `feature/landing-sections`.

**i18n cleanup (P2, Audit L4).** Move hardcoded Ukrainian toast strings in `add-item-modal.tsx` into `messages/en.json` + `messages/uk.json`. Can ride along with any PR touching that file.

**Split `wishlist-appearance.ts` (P2, Audit L3).** 647-line module → separate token-resolution / settings-state / widget-state / presentation. Pure refactor, keep tests green. Branch: `refactor/split-appearance`.

**Friends UI (P3, Notion #42).** `follow-user` action + `Follows` model already exist; build the friends/followers UI on top. Branch: `feature/friends`.

**More auth providers (P3, Notion #27).** Add providers (Apple/Facebook/Microsoft) to `src/auth.ts`, or evaluate a Clerk/Supabase migration. Branch: `feature/auth-providers`.

**v3 personal gift page (P3, Notion #34)** and **deploy pipeline (P3, Notion #23)** — scope when reached.

---

## Notion board sync (do alongside)
- Flip **#28 Categories**, **#31 Filtering**, **#29 Custom wish page** → **Done** (already shipped; Audit §7).
- As each PR above lands, move its Notion card (#46/#48/#49/#15/#16/#17/#18/#51/#36/#45…) to In progress → Done.

## Global verification
For each PR before merge: `npm run lint`, `npm test`, `npx prisma migrate dev` (for schema PRs), and manually drive the affected flow in `npm run dev` (node_modules must be installed — this checkout has none). The `verify` skill can drive end-to-end checks on the changed flow.
