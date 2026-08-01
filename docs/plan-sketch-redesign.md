# Plan: migrate the site to the "Sketch" design

_Written 2026-08-01. Implements [`design-landing-sketch-concept.md`](./design-landing-sketch-concept.md)._
_Reference mockup: <https://claude.ai/code/artifact/0b526d2f-5d96-4617-bf7e-54ecbe3284d7> (static HTML, not live code)._

## 0. Scope, and how it differs from the concept doc

The concept doc scopes the sketch identity to "marketing chrome only" and says explicitly that it
must not touch `wishlist-appearance.ts` or the per-user presets. **That scope is superseded**: the
design should be consistent, so the landing page *and* user wishlists move to the new look, with
settings brought close to it.

That reopens the question the original scope note was protecting: per-user themeability is a real
product feature (the landing page literally advertises it in section 5). The resolution this plan
uses — **split the identity into two independent axes**:

| Axis | Where it comes from | Where it applies |
|---|---|---|
| **Structure & type** — double-stroke boxes, hatch fills, wobble icons, handwritten headings, ruled paper | brand, fixed | every surface: landing, header/footer, wishlist page, embed, settings, login, 404 |
| **Color** — which ink on which paper | per-user `resolveWishlistAppearance` on wishlist surfaces; brand tokens elsewhere | wishlist page + embed keep the user's preset; marketing/app chrome uses the brand palette |

So a `rose` wishlist becomes "rose ink, sketched" instead of being repainted in brand colors. Every
sketch rule reads its stroke color from the resolved appearance tokens (`--border`, `--foreground`,
`--muted-foreground`), never from a hardcoded brand hex. The brand paper/chalk palette is then
offered *as two new presets* (`paper`, `chalk`) and seeded as the default for **new** wishlists —
existing users' explicit choices are never rewritten.

Non-goals: no brand rename ("Wishlist" stays), no schema migration, no change to reservation
privacy, visibility, or any server action behavior.

## 1. What's actually in the repo today

Verified before writing this plan — the concept doc assumes some things that aren't true here.

| Fact | Where | Consequence for this plan |
|---|---|---|
| Tailwind **v4** via `@tailwindcss/postcss`; tokens live in `@theme inline` + `:root`/`.dark` | [globals.css:1-116](../src/app/globals.css#L1-L116) | New tokens go in `globals.css`, not in a config file |
| `tailwind.config.ts` is v3-shaped and **never loaded** (no `@config` in the CSS) | [tailwind.config.ts](../tailwind.config.ts) | Dead file. Delete it (Phase 6), don't add tokens to it |
| Dark mode = `.dark` class from next-themes (`attribute="class"`, `defaultTheme="system"`) + `@custom-variant dark (&:is(.dark *))` | [layout.tsx:29](../src/app/[locale]/layout.tsx#L29), [globals.css:4](../src/app/globals.css#L4) | **Ignore** the mockup's `@media (prefers-color-scheme)` + `[data-theme]` blocks; dark values go under `.dark` only, or an explicit "light" choice loses to the OS |
| No `next/font` anywhere; `--font-sans: var(--font-geist-sans)` is declared but never defined | [globals.css:9](../src/app/globals.css#L9) | Font wiring is greenfield; `font-sans` currently falls back to the Tailwind default stack |
| `font-sans` is a **user-selectable wishlist font** (`FONT_OPTIONS`) | [wishlist-appearance.ts:31-42](../src/lib/wishlist-appearance.ts#L31-L42) | Never rebind `--font-sans` to a handwritten face — it would silently rewrite every user who picked "Sans serif" |
| Wishlist page applies appearance as inline CSS vars + `fontClass` + `itemBorderClass` | [\[username\]/page.tsx:61-83](../src/app/[locale]/[username]/page.tsx#L61-L83) | Brand tokens must be *additional* variables (`--sk-*`), never redefinitions of `--background`/`--foreground` outside `:root` |
| Item card internals are shared by the profile page and the embed | [src/components/wishlist/](../src/components/wishlist/) | Restyling those components covers both surfaces at once |
| `SiteHeader` renders on every page including user wishlists; wordmark is `hidden sm:inline-block` | [site-header.tsx:14-27](../src/components/site-header.tsx#L14-L27) | Brand chrome sits above a user-themed page (accepted, see Phase 1); mobile currently renders an empty logo link — fix while there |
| Vitest is `environment: 'node'`, coverage only over `src/actions` + `src/lib`; no RTL/jsdom | [vitest.config.ts](../vitest.config.ts) | No component tests without new deps. Automated coverage = the pure appearance modules; visual work is verified by build + manual matrix |
| Landing copy uses `t('key') || "English fallback"` | [\[locale\]/page.tsx:44-109](../src/app/[locale]/page.tsx#L44-L109) | Dead code (next-intl never returns falsy); drop the `||` fallbacks while rewriting |

**Font blocker (verified against Google Fonts metadata):** `Architects Daughter` covers latin +
latin-ext; `Patrick Hand` covers latin, latin-ext, vietnamese. **Neither has Cyrillic**, and the app
ships a `uk` locale ([messages/uk.json](../messages/uk.json)). Fix: pair each with a Cyrillic-capable
handwriting face and let per-glyph font fallback do the work —

- display: `"Architects Daughter", "Caveat", cursive` (Caveat: latin, latin-ext, cyrillic, cyrillic-ext)
- body: `"Patrick Hand", "Pangolin", cursive` (Pangolin: latin, latin-ext, cyrillic, cyrillic-ext, vietnamese)

Browsers fall through per character, so Ukrainian copy renders in the companion face automatically
with no locale branching. Check the two pairs optically at implementation time (x-height/weight) and
swap the companion if a pair reads badly.

**Contrast fix:** the concept's light `--text-muted` `#7A756A` on `#FAF7EF` paper is **4.29:1** —
below WCAG AA for body text. Use `#6E6A5F` (5.06:1). The other pairs pass: accent `#3E5C82` 6.39:1,
highlight `#C1432E` 4.75:1, dark muted `#A8ACA6` on `#24272B` 6.49:1.

## 2. Sequencing

One branch per phase, off `main`, in order. Phases 0–2 are the marketing pass and are independently
shippable; 3–4 are the wishlist pass; 5–6 are cleanup.

| Phase | Branch | What lands | Depends on |
|---|---|---|---|
| 0 | `feature/sketch-foundations` | fonts, tokens, CSS primitives, wobble filter — no visual change | — |
| 1 | `feature/sketch-chrome` | `SiteHeader` + new `SiteFooter` sitewide | 0 |
| 2 | `feature/sketch-landing` | landing page rebuilt, 7 sections, en+uk copy | 0, 1 |
| 3 | `feature/sketch-wishlist` | shared item render module in sketch (profile + embed) | 0 |
| 4 | `feature/sketch-presets` | `paper`/`chalk` presets, sketch font + border options, new-wishlist defaults | 3 |
| 5 | `feature/sketch-app-surfaces` | settings, login, 404 | 1, 4 |
| 6 | `chore/sketch-cleanup` | delete dead config, docs, final a11y sweep | all |

---

## Phase 0 — Brand foundations (no visual change)

**Files**
- `public/fonts/` (new) — `ArchitectsDaughter-Regular.woff2`, `PatrickHand-Regular.woff2`, `Caveat-Regular.woff2`, `Pangolin-Regular.woff2`, plus each family's `OFL.txt`
- `src/lib/brand-fonts.ts` (new)
- `src/app/globals.css`
- `src/components/brand/sketch-filters.tsx` (new)
- `src/app/[locale]/layout.tsx`

**Steps**

1. Download the four `.woff2` files (latin + latin-ext for the primaries, cyrillic for the
   companions) into `public/fonts/` with their OFL licences. No `fonts.googleapis.com` at runtime,
   no base64 data URIs — the mockup's inlining was a CSP workaround for the artifact sandbox only.
2. `src/lib/brand-fonts.ts`: four `next/font/local` declarations exposing
   `--font-display-primary`, `--font-display-cyr`, `--font-hand-primary`, `--font-hand-cyr`
   (`display: "swap"`, `weight: "400"`, `style: "normal"`). Export one `brandFontVariables` string
   for the `<html>` className.
3. `globals.css` `@theme`: compose the two stacks so Cyrillic falls through —
   `--font-display: var(--font-display-primary), var(--font-display-cyr), cursive;`
   `--font-hand: var(--font-hand-primary), var(--font-hand-cyr), cursive;`
   This yields `font-display` / `font-hand` utilities. **Do not touch `--font-sans`/`--font-mono`.**
4. `globals.css` brand tokens — additive, namespaced, never overriding shadcn's:
   `--sk-bg`, `--sk-surface`, `--sk-line`, `--sk-text`, `--sk-text-muted` (`#6E6A5F` in light),
   `--sk-accent`, `--sk-accent-contrast`, `--sk-highlight`, `--sk-hatch`; light values in `:root`,
   dark values under `.dark` (§1 — no media query, no `[data-theme]`).
5. `globals.css` primitives in `@layer components`, ported from the mockup:
   - `.sketch` / `.sketch::after` — the double stroke
     (`border-radius: 16px 9px 14px 10px / 9px 15px 10px 16px`; `::after` `inset:-5px`, mismatched
     radius, `opacity:.45`, `rotate(-.7deg)`), `.sketch-tight` variant at `inset:-3px`
   - `.sketch-hatch` — `repeating-linear-gradient(45deg, …)` at 1.2px/7px
   - `.wobble-icon` — `filter: url(#wobble)`
   - `.paper-rules::before` — the ruled-paper layer. **Attach it to a wrapper class, not `body`**, so
     the embed iframe and short pages can opt out; keep `opacity:.12`, `pointer-events:none`,
     `z-index:0`, content above at `z-index:1`.
   Every stroke/fill color resolves through `currentColor` or an overridable var
   (`--sk-line: var(--sk-line-override, …)`) so Phase 3 can feed user tokens in.
6. `SketchFilters` — one hidden `<svg aria-hidden focusable="false">` (`position:absolute;width:0;height:0`)
   defining `<filter id="wobble">` (`feTurbulence type="fractalNoise" baseFrequency="0.045 0.09"
   numOctaves="2" seed="7"` + `feDisplacementMap scale="3.2"`), rendered **once** in `layout.tsx`.
   Rule to write in the file's comment: applied to decorative SVG only, never to anything containing
   text — displacement garbles glyphs.
7. `layout.tsx`: add `brandFontVariables` to `<html>`, render `<SketchFilters />` inside `<body>`.
   Leave `body className="font-sans"` alone for now.

**Acceptance**
- `npm run lint`, `npm test`, `npm run build` green.
- Zero visual diff on every page (the new CSS is defined but unused).
- Build output serves fonts from `/_next/static`; no request to `fonts.googleapis.com` (grep the
  built HTML/CSS).

---

## Phase 1 — Header and footer, sitewide

**Files:** `src/components/site-header.tsx`, `src/components/brand/wishlist-mark.tsx` (new),
`src/components/site-footer.tsx` (new), `src/app/[locale]/layout.tsx`, `messages/en.json`, `messages/uk.json`

**Steps**

1. `WishlistMark` — the hand-drawn star-scribble SVG from the mockup, `currentColor` strokes,
   `className="wobble-icon"`, `aria-hidden` (the adjacent wordmark is the accessible name).
2. `SiteHeader`: mark + "Wishlist" wordmark in `font-display`; sketch-styled "Sign in"
   (border `1.6px` `--sk-line`, asymmetric radius); keep sticky + `backdrop-blur`, swap the bottom
   border to `1.6px solid var(--sk-line)`. Keep `ThemeToggle`, `LanguageSwitcher`, `UserNav` as-is.
   Fix the mobile logo: show the mark always, wordmark from `sm:`.
3. `SiteFooter` — wordmark, one-line tagline, copyright; new `Footer` namespace in both message
   files. Rendered in `layout.tsx` after `{children}`.
4. **Decision to record in code:** header/footer always use brand tokens, including on a user's
   themed wishlist page — it's app chrome, not the user's page. The `1.6px` ink border plus the
   header's own `--sk-bg` fill is what separates the two zones.

**Acceptance**
- Header/footer correct at 360 / 768 / 1280px, light + dark, `en` + `uk`, signed out + signed in.
- Theme toggle still switches instantly; no hydration warning.
- No layout shift on font swap (check `size-adjust` fallback metrics; add `adjustFontFallback` if needed).
- Wordmark visible on mobile (regression fix).

---

## Phase 2 — Landing page

**Files:** `src/app/[locale]/page.tsx`, `src/components/landing/*.tsx` (new),
`messages/en.json`, `messages/uk.json`

Seven sections per concept §5, on a `.paper-rules` wrapper:

1. Header (Phase 1, already global).
2. **Hero** — two columns; headline with the `--sk-highlight` underline swash (wobble SVG), subhead,
   CTA; right side a fanned stack of three rotated sketch item cards (hatch thumbnail, name, circled
   price badge, star rating, one "Reserved" pill). Cards collapse to a single un-rotated card below `md`.
3. **"Surprise" strip** — `"You'll never see who reserved what."` Backed by the real owner-blind
   gating in [\[username\]/page.tsx](../src/app/[locale]/[username]/page.tsx) and
   [reservation.ts](../src/lib/reservation.ts) — if that behavior ever changes, this copy must change.
4. **Features 3-up** — Make it yours / Keep the surprise / Find the right gift fast, each with a
   wobble icon.
5. **Personalize showcase** — mini preset cards generated from `COLOR_PRESET_OPTIONS` +
   `APPEARANCE_PRESETS` so the section cannot drift from the product (it picks up `paper`/`chalk`
   automatically once Phase 4 lands).
6. **Embed section** — sketched browser-chrome mockup containing a miniature widget (hatch
   thumbnails), replacing today's text-only description.
7. **Footer** (Phase 1).

Copy: restructure the `HomePage` namespace for the new sections, delete the `|| "English"` fallbacks,
and write **real Ukrainian** for every new key — not English placeholders.

**Acceptance**
- Every `t()` key exists in both `en.json` and `uk.json` (no key-path leakage on `/uk`).
- Renders correctly light + dark, 360 → 1440px, no horizontal scroll.
- Preset showcase reflects `APPEARANCE_PRESETS` at runtime (add a preset locally → card appears).
- `generateMetadata` still returns title/description for both locales.

---

## Phase 3 — Wishlist + embed item rendering

**Files:** `src/components/wishlist/wishlist-item-image.tsx`, `wishlist-item-price.tsx`,
`wishlist-avatar.tsx`, `wishlist-banner.tsx`, `style-utils.ts`,
`src/app/[locale]/[username]/page.tsx`, `src/app/[locale]/embed/[username]/page.tsx`

**Steps**

1. Item card frame: `.sketch` double stroke, with `--sk-line-override` fed from the resolved
   appearance (`tokens.border` / `tokens.foreground` mix via the existing
   [`borderColorWithAlpha`](../src/components/wishlist/style-utils.ts)). Sketch structure, user color.
2. `WishlistItemImage`: replace the `bg-muted` + `Gift` fallback with the `.sketch-hatch` placeholder
   (hatch color from `tokens.mutedForeground`), keeping the `Gift` glyph centered. Decorative layer
   `aria-hidden`; the `alt` contract is unchanged.
3. `WishlistItemPrice`: circled-pencil badge in `font-display`, `--sk-highlight` → user token.
   Priority stars and the "Reserved" pill (dashed border) follow the same rule.
4. Headings (`wishlist_title`, welcome message) in `font-display`; body text keeps the user's
   `fontClass` — that setting is theirs, don't override it.
5. Embed page inherits all of the above through the shared components; verify at the 70–160px item
   widths the widget supports, and confirm the ruled-paper layer is **not** applied inside the iframe.

**Tests:** extend [`style-utils.test.ts`](../src/components/wishlist/__tests__/style-utils.test.ts)
for any new color-derivation helper. Visual behavior is verified manually (no jsdom in this repo).

**Acceptance**
- All five existing presets still render legibly, light + dark, with the sketch structure.
- Embed widget unchanged in size/layout; grid and list layouts both fine.
- No regression in `npm test`.

---

## Phase 4 — Appearance system: brand palette as user options

**Files:** `src/lib/wishlist-appearance.ts`, `src/lib/__tests__/wishlist-appearance.test.ts`,
`src/app/globals.css`, `src/lib/ensure-user-wishlist.ts`,
`src/app/[locale]/dashboard/settings/settings-form.tsx`, `messages/en.json`, `messages/uk.json`

**Steps**

1. Add `paper` and `chalk` to `ColorPreset` / `COLOR_PRESET_OPTIONS` / `APPEARANCE_PRESETS`, built
   from the brand tokens (light muted at `#6E6A5F`, §1). Label keys `colorPresetPaper` /
   `colorPresetChalk` in both message files.
2. Add a handwritten option to `FONT_OPTIONS` — `font-sketch`, backed by a `.font-sketch` utility in
   `globals.css` pointing at `--font-hand` — and to `ALLOWED_FONT_CLASSES` (the allow-list on write
   in `parseWishlistAppearance` is what keeps this safe).
3. Add `"rounded-lg border-sketch"` to `ITEM_BORDER_OPTIONS` + `ALLOWED_ITEM_BORDER_CLASSES`, with a
   `.border-sketch` utility that turns on the double stroke. **Opt-in, not forced** — a user who
   explicitly chose "Dotted" keeps dotted.
4. New wishlists only: seed `appearance` in `ensureUserWishlist` with
   `{ colorPreset: "paper", font: "font-sketch", itemBorder: "rounded-lg border-sketch" }`.
   `selectPresetName`'s fallback stays `"light"` so existing rows are untouched.
5. Settings Appearance tab: the preset swatch row picks the two new presets up from
   `COLOR_PRESET_OPTIONS` automatically — verify the swatch preview renders their colors, and that
   `getAdvancedColorSeedForPreset` seeds correctly when they're selected.

**Tests** (`wishlist-appearance.test.ts`)
- `resolveWishlistAppearance({colorPreset:"paper"|"chalk"})` returns the expected tokens.
- Both presets' `foreground`/`background` clear `MIN_CONTRAST_RATIO`.
- `normalizeWishlistFontClass("font-sketch")` and `normalizeWishlistItemBorderClass("rounded-lg border-sketch")` round-trip; unknown values still fall back.
- `parseWishlistAppearance` preserves unknown keys (`widgetLayout`/`widgetItemSize`) — existing guarantee, re-assert with the new fields present.
- New: `ensureUserWishlist` seeds the sketch defaults (extend [`ensure-user-wishlist.test.ts`](../src/lib/__tests__/ensure-user-wishlist.test.ts)).

---

## Phase 5 — Settings, login, 404

**Files:** `src/components/ui/button.tsx`, `src/app/[locale]/dashboard/settings/*`,
`src/app/[locale]/login/page.tsx`, `src/app/[locale]/not-found.tsx`

**Rule for this phase:** sketch *frames and headings*, plain *controls*. Section cards, tab strips,
and headings get `.sketch` + `font-display`; `Input`, `Label`, `Select`, and the settings form's
color pickers keep the current sans face and radii — handwritten type at 14px inside form fields
hurts legibility and hit accuracy, which is the concern the concept doc already flagged.

1. Add a `sketch` variant to the shadcn `Button` cva so marketing CTAs and app buttons stay one component.
2. Settings: wrap each section in `.sketch`, headings to `font-display`, tabs get the sketchy
   underline. Widget preview panel inherits Phase 3 automatically.
3. Login: card → `.sketch`, heading → `font-display`, Google button keeps its icon; also move the two
   hardcoded English strings (`"Use your email or Google account to continue"`,
   `"Sign in with Email"`) into the message files while here.
4. 404: swap the `Gift` circle for the wobble "eye" mark.

**Acceptance:** every form still submits (profile save, share-link reset, widget settings); focus
rings visible against paper/chalk; tab order unchanged.

---

## Phase 6 — Cleanup

- Delete `tailwind.config.ts` (dead under v4 — confirm nothing imports it, then remove
  `tailwindcss-animate` if unused, or wire `@config` instead if something turns out to need it).
- Remove the stale `--font-geist-sans` / `--font-geist-mono` references in `globals.css`.
- Update [`design-landing-sketch-concept.md`](./design-landing-sketch-concept.md): status → implemented,
  and correct §2/§3/§6 (scope now sitewide, `.dark` not `[data-theme]`, Cyrillic companion fonts).
- Add a short "brand vs. per-user appearance" paragraph to `CONTEXT.md` — the two-axis rule from §0 is
  the thing a future contributor will otherwise break.

---

## Verification (every phase)

```
npm run lint && npm test && npm run build
```

Manual matrix — landing, header/footer, wishlist page, embed iframe, settings, login, 404 × {light,
dark} × {en, uk} × {360px, 768px, 1280px} × {signed out, signed in}.

Accessibility sweep before Phase 6 closes:
- Contrast: brand pairs listed in §1; user presets already gated by `hasSufficientContrast`.
- `filter: url(#wobble)` appears only on decorative SVG — grep for it beside any text node.
- Hatch fills and the ruled layer are `aria-hidden` / `pointer-events:none`.
- `forced-colors: active` — gradients drop out; confirm cards still have a visible border.
- Keyboard focus visible on paper *and* chalk backgrounds.

## Risks

| Risk | Mitigation |
|---|---|
| Handwritten type hurts readability at body sizes | Body face is the neater of the two; form controls stay sans (Phase 5); `uk` gets a Cyrillic face rather than a system fallback |
| Brand tokens leak into user-themed pages | `--sk-*` namespace; never redefine `--background`/`--foreground`/`--font-sans` outside `:root` defaults |
| Existing wishlists silently restyled | New presets are opt-in; sketch border is a new allow-listed option; only `ensureUserWishlist` seeds the new defaults |
| `.sketch::after` on every item card costs paint | Pure CSS, no filters on cards; the wobble filter stays on a handful of small icons |
| `color-mix(in oklab, …)` from the mockup | Supported in current evergreen browsers; if a baseline concern, precompute the two token values instead |
| No component test harness | Pure appearance logic is unit-tested; UI verified by the manual matrix — adding jsdom + RTL is out of scope here |
