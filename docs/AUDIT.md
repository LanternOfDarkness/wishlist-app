# Wishlist App — Code & Functionality Audit

_Date: 2026-07-16 · Scope: full codebase (`src/`, `prisma/`), read-only audit · Branch: `claude/code-functionality-audit-kcibfg`_

This report covers a code & functionality audit and reconciles the Notion "Wishlist" backlog against what is actually implemented, ending with a prioritized roadmap for next updates.

---

## 1. Executive summary

The app is a well-structured Next.js 16 / React 19 / Prisma / NextAuth v5 project. The read-side view-model layer (`src/lib`) is clean and reasonably unit-tested, appearance customization is genuinely polished, and mutations consistently route through a central ownership gateway.

However, the audit found:

- **One critical security hole** — the metadata scraper is unauthenticated and vulnerable to SSRF.
- **A dead access-control field** — `Wishlist.isPublic` is never enforced, so "private" wishlists aren't private.
- **Several half-built or dead features** — reservations/pledges, item edit/delete, and the multi-wishlist creation path exist in schema/UI fragments but have no working code path.
- **Thin test coverage where it matters most** — the entire authorization layer and every server action except one are untested.
- **A stale backlog** — three features marked "Not started" in Notion are actually already shipped.

Nothing in this report has been changed in code; fixes are proposed but not applied.

---

## 2. Architecture snapshot

- **Framework:** Next.js 16.1.6 (App Router), React 19.2.3, TypeScript.
- **Data:** Prisma 5 + PostgreSQL. **One wishlist per user**, auto-created on signup.
- **Auth:** NextAuth v5 beta, **JWT session strategy**, providers = Google + Nodemailer email magic link. `userId`/`username` injected into the token/session.
- **i18n:** next-intl, locales `en` + `uk` (Ukrainian is the original language; some UA strings are still hardcoded).
- **Routes** (all under `[locale]/`): landing page, `login`, `dashboard` (auth-gates then redirects to the user's public page), `dashboard/settings` (General / Appearance / Widget tabs), `[username]` (the core public wishlist page), `embed/[username]` (iframe widget). One API route: `api/auth/[...nextauth]`.
- **Server actions (7):** `add-item`, `create-wishlist`, `fetch-metadata`, `follow-user`, `update-profile`, `update-widget-items`, `update-widget-settings`.
- **Authorization gateway:** `src/lib/wishlist-command-context.ts` (`requireAuthenticatedUserId`, owned-wishlist / owned-item lookups). Every mutating action except `fetch-metadata` goes through it.
- **Middleware:** `src/proxy.ts` — this is the **correct** convention for Next.js 16 (middleware was renamed `middleware.ts` → `proxy.ts`). It composes NextAuth `auth()` with next-intl routing and guards `/dashboard`. _Not a bug_ (noting it here because it can look like unwired middleware at a glance).

---

## 3. Findings by severity

### 🔴 CRITICAL

#### C1 — SSRF + missing authentication in the metadata scraper
**`src/actions/fetch-metadata.ts:12-42, 91`**

`parseHttpUrl` (line 15) only validates that the protocol starts with `http`. There is no blocking of internal / private / link-local hosts, so all of these pass:
`http://169.254.169.254/latest/meta-data/` (cloud instance metadata), `http://localhost:*`, `http://10.0.0.0/8`, `http://[::1]/`, internal `.svc` hostnames, etc.

Two aggravating factors:
- **No auth check.** Unlike every other action, `fetchMetadata` never calls `getAuthenticatedUserId`. It's invoked from the client (`src/components/add-item-modal.tsx:53`), so it is reachable as a POST server-action endpoint by **any anonymous visitor**.
- **`fetch` follows redirects by default** (line 27), so even a host allowlist would be bypassable via an open redirect / attacker-controlled `301`.

**Impact:** an unauthenticated attacker can make the server issue arbitrary internal HTTP requests (cloud metadata theft, internal port scanning, hitting internal-only services). This is the top priority.

**Fix direction:** require an authenticated user; resolve the hostname and reject private/loopback/link-local IP ranges (check every resolved address, not just the hostname string); set `redirect: "manual"` and re-validate on each hop; keep the existing 10s timeout.

---

### 🟠 HIGH

#### H1 — `Wishlist.isPublic` is never enforced
**`prisma/schema.prisma:71`** defines `isPublic Boolean @default(true)`, but a repo-wide search of `src/` returns **zero** references. Neither `getWishlistPresentation` nor `getEmbedWishlistPresentation` (`src/lib/wishlist-presentation.ts`) filters on it.

**Impact:** a wishlist flagged private still renders in full on the public `/[username]` page and in the embeddable iframe. This is a dead access-control field / latent data exposure.

**Fix direction:** either enforce `isPublic` in both presentation loaders (return not-found for non-owner viewers of a private list) or remove the field if the feature isn't wanted. Add a test for the private case.

#### H2 — Private-item visibility rests entirely on the follow graph
**`src/lib/wishlist-presentation.ts:29-48`, `src/lib/wishlist-filter-state.ts:84-86`**

Private items are shown when `isOwner || isMutualFollower`. The logic itself is correct — the embed path hard-filters `isPrivate:false` — but it's the _only_ gate, and it is compounded by H1: a "private" wishlist's non-private items still leak via the embed widget. Worth confirming this matches intended visibility rules, and covering it with a test.

---

### 🟡 MEDIUM

#### M1 — Reservation / Pledge feature is dead schema
`isReserved` is rendered as a "reserved" badge (`src/app/[locale]/[username]/page.tsx:233-237`) and `Pledge` is a full Prisma model (`prisma/schema.prisma:112`), but **no server action anywhere sets `isReserved` or creates a `Pledge`**. The whole gift-reservation flow exists only in the database and a badge. (This maps directly to Notion #15/#16/#17/#18.) Note: because there's no write path, there is no reservation race condition _yet_ — but there will be once it's built, so plan for it (see roadmap).

#### M2 — `createWishlist` action + `CreateWishlistModal` are dead
`Wishlist.userId` is `@unique` and a wishlist is auto-created for every user (in the `createUser` event, `src/auth.ts`, and again in `dashboard/page.tsx`). A second `prisma.wishlist.create` always violates the unique constraint → caught → returns a generic error. `CreateWishlistModal` (`src/components/create-wishlist-modal.tsx`) imports the action but is itself imported nowhere. Leftover from the multi-wishlist → one-wishlist-per-user pivot (migration `20260207103554_one_user_one_wishlist`). Remove both, or intentionally re-introduce multi-wishlist support.

#### M3 — Item CRUD is incomplete: no edit or delete
The only item mutation is `addItem`; `updateWidgetItems` only toggles `showInWidget`. There is no edit-item, delete-item, delete-wishlist, or delete-account action. Users can add items but never change or remove them. (Notion #46/#48/#49.)

#### M4 — Missing foreign-key indexes in the Prisma schema
PostgreSQL does not auto-index FK columns, and the schema has no `@@index` directives at all. Missing indexes on:
- `Item.wishlistId` and `Item.categoryId` — every wishlist page filters items by `wishlistId`.
- `Follows.followingId` — follower-count / "following"-side lookups scan (`followerId` is covered as the first PK column).
- `Pledge.itemId`, `Pledge.userId`, `Category.userId`.

**Fix direction:** add `@@index` on each and generate a migration.

#### M5 — TOCTOU race on the widget 5-item limit
**`src/actions/update-widget-items.ts:15-26`** counts selected items, then updates in a separate query. Two concurrent requests can both pass the `count >= 5` check and exceed the cap. Low impact (cosmetic limit), but a real race — fold the check into a transaction or a conditional update.

---

### 🟢 LOW

- **L1 — `updateProfile` username validation is thin** (`src/actions/update-profile.ts:15-24, 40-51`): no format / length / reserved-word checks. Route-colliding usernames (`dashboard`, `login`, `embed`, `api`), empty/whitespace, or unicode can be set. Uniqueness is checked but the raw value is written.
- **L2 — Swallowed / flattened errors**: `add-item.ts:26`, `create-wishlist.ts:38`, and `fetch-metadata.ts:104` collapse all failure modes into one generic message/`null`, making an authorization denial indistinguishable from a DB or network failure. Harder to debug and to alert on.
- **L3 — `wishlist-appearance.ts` is 647 lines**, doing token resolution + settings-state + widget-state + presentation. Split candidate.
- **L4 — Hardcoded Ukrainian toast strings bypass i18n** (`src/components/add-item-modal.tsx:59, 76, 96, 100`).
- **L5 — All `<Image>` components use `unoptimized`**, silently bypassing the `next.config.ts` `images.remotePatterns` allowlist. Arbitrary external images load client-side (a privacy/tracking concern, not SSRF).
- **L6 — Duplicated wishlist auto-create logic** in `src/auth.ts` (`createUser` event) and `src/app/[locale]/dashboard/page.tsx`, with different hardcoded titles ("Мої бажання" vs a translated string). Consolidate to one path.

---

## 4. Testing gaps

`vitest.config.ts` restricts coverage `include` to `src/actions/fetch-metadata.ts` and `src/lib/**` only.

- **Well covered:** `fetch-metadata` (7 cases) and the pure lib logic — `wishlist-filter-state`, `wishlist-presentation`, `wishlist-item-intake`, `wishlist-settings-state`, `wishlist-appearance`, `wishlist-appearance-form`.
- **Untested:** the **entire authorization layer** (`requireOwnedWishlistById`, `requireOwnedWishlistItem`, the `canViewPrivateItems` gate) and **every server action except `fetch-metadata`**. No test would have caught H1 (`isPublic`), M2 (broken `createWishlist`), or M1 (dead reservation).
- The `fetch-metadata` tests do **not** cover the SSRF case — because the code doesn't block it.

**Recommendation:** add action-level tests for ownership/authz, add an explicit SSRF-block test, and broaden the coverage `include` to all of `src/actions/`.

---

## 5. Notion backlog reconciliation

Your Notion "Wishlist" board is partly out of date. Reconciled against the actual code:

| # | Item | Notion status | Actual code status |
|---|------|---------------|--------------------|
| 28 | Categories | Not started | ✅ **Built** — `Category` model + intake (`wishlist-item-intake-command.ts`) |
| 31 | Filtering price/type | Not started | ✅ **Built** — `wishlist-filters.tsx`, `wishlist-filter-state.ts` |
| 29 | Custom wish page (colors/design) | Not started | ✅ **Built** — full appearance system (merged PR #37) |
| 32 | Currency + languages | Done | ✅ Correct |
| 15 | Pledge Model | In progress | ⚠️ Schema only — no action/UI (dead, see M1) |
| 16 | Booking UI | In progress | ⚠️ Not built — `isReserved` badge renders but is never set |
| 42 | Friends functionality | Not started | 🟡 **Partial** — `follow-user` action + `Follows` model exist; no friends UI |
| 46 | Items editing | Not started | ❌ Missing (see M3) |
| 48 | Item deleting | Not started | ❌ Missing (see M3) |
| 49 | Items archiving | Not started | ❌ Missing — no `isArchived` field |
| 51 | Dark mode | Not started | ❌ Missing — `next-themes` installed but only used in `sonner.tsx`; no `ThemeProvider` |
| 36 | 404 page | Not started | ❌ Missing — no `not-found.tsx` |
| 17 | Guest Form | Not started | ❌ Missing (depends on M1) |
| 18 | Status Updates (progress bar) | Not started | ❌ Missing (depends on M1) |
| 19/20/21 | Landing Hero / Features / Footer | Not started | ❌ Missing (basic landing page exists, not these sections) |
| 44 | Dashboard changes | Not started | ❌ Missing |
| 45 | Setting: add avatar | Not started | ❌ Missing — no upload flow |
| 27 | More auth providers / Clerk-Supabase | Not started | ❌ Missing (Google + email only) |
| 34 | v3 Personal gift page | Not started | ❌ Missing |
| 23 | Deploy | Not started | ❌ Not configured |

**Board corrections to make** (flip to Done so the board matches reality): **#28 Categories**, **#31 Filtering price/type**, **#29 Custom wish page**. (Not auto-applied — see §7.)

---

## 6. Prioritized roadmap

**P0 — Security (do first)**
1. Fix the `fetch-metadata` SSRF + add auth (C1).
2. Enforce or remove `Wishlist.isPublic` (H1), and confirm private-item visibility rules (H2).

**P1 — Core functionality (highest user value)**
3. Item **edit / delete / archive** (#46/#48/#49, M3) — currently a user cannot manage their own list at all after adding.
4. **Reservation / pledge feature** end-to-end (#15/#16/#17/#18, M1) — the app's differentiator, currently dead schema. Build the write path inside a transaction with a uniqueness/atomic guard so the reservation race (M5-style) can't double-book an item.

**P2 — Polish & correctness**
5. Dark mode `ThemeProvider` (#51), custom 404 page (#36), avatar upload (#45), landing Hero/Features/Footer sections (#19/#20/#21).
6. Add FK indexes (M4); action-level authz tests + SSRF test + broaden coverage (§4); username validation (L1); i18n the hardcoded toasts (L4); remove dead `createWishlist`/`CreateWishlistModal` (M2); consolidate duplicated auto-create logic (L6).

**P3 — Later**
7. Friends/social UI (#42), additional auth providers (#27), v3 gift page (#34), deploy pipeline (#23).

---

## 7. Notion board corrections (recommended, not applied)

To bring the board in line with the code, flip these three from **Not started → Done**:

- #28 Categories
- #31 Filtering price/type
- #29 Custom wish page (colors/cards design)

I can apply these updates and/or add a board row for each finding above if you want — just say the word.
