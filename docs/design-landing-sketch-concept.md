# Landing Page Design Concept — "Sketch"

_Date: 2026-08-01 · Status: concept approved, not yet implemented · Scope: marketing chrome only (landing page, `SiteHeader`, footer)_

Three visual directions were explored for the landing page and site branding (forest/tag, cozy/knit, sketch). The **sketch concept** was picked as the direction to build. This doc records the design decisions so implementation can happen in a separate pass without re-deriving them.

Reference mockup (static HTML, not live code): see the "Wishlist — Sketch Concept" artifact from this conversation for the full visual reference — header, hero, features, preset showcase, embed section, footer, both color schemes.

**Important scope note:** this is a brand identity for the *marketing surface* only. It must not touch `src/lib/wishlist-appearance.ts` or the per-user color presets (light/rose/green/dark/minimal) — those stay exactly as they are, since each user's own wishlist page is intentionally themeable independently of the brand.

---

## 1. Concept

A hand-drawn, pencil-and-paper aesthetic — sketchy wobble borders, hatch-textured placeholders instead of photos, handwritten type. Light paper background per the request that ruled out the two earlier (forest and cozy) directions. Dark mode is not an inverted palette — it's a distinct "chalk on a blackboard" treatment, since that's the one hand-drawn medium that's naturally dark.

## 2. Color tokens

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` (page) | `#FAF7EF` (warm paper) | `#24272B` (chalkboard slate) | page background |
| `--surface` (card) | `#FFFDF8` | `#2C3035` | card/box fill |
| `--text` / `--line` (ink) | `#2E2B26` | `#EDEAE0` (chalk) | body text, borders, icon strokes |
| `--text-muted` | `#7A756A` | `#A8ACA6` | secondary copy |
| `--accent` (pen) | `#3E5C82` (blue pen) | `#8FB4D9` (chalk blue) | links, primary buttons, structural icons |
| `--highlight` (pencil) | `#C1432E` (red pencil) | `#E08672` (chalk coral) | prices, stars, "Reserved" pill, headline underline swash |
| `--hatch` | `#7A756A` | `#6E7278` | diagonal hatch-fill lines on thumbnail placeholders |

Dark mode must be implemented as separate token values (not a CSS `invert()` or opacity trick) — see the artifact's `@media (prefers-color-scheme: dark)` + `:root[data-theme="dark"]` blocks for the exact pattern to mirror.

## 3. Typography

- **Display / headings / logo / prices:** "Architects Daughter" — hand-lettered, technical-sketch character.
- **Body / nav / buttons / paragraphs:** "Patrick Hand" — neater handwriting, legible at body-text sizes.
- Both are open-license (SIL OFL) Google Fonts. The mockup inlines them as base64 `@font-face` data URIs (CSP-safe for the artifact sandbox); **for the real site, self-host the actual `.woff2` files** under `public/fonts/` and load via `next/font/local` instead — do not link `fonts.googleapis.com` at runtime and do not keep them as inline base64 in a stylesheet.
- Font files used (for re-fetching at implementation time): `Architects Daughter` (weight 400) and `Patrick Hand` (weight 400), latin subset, from Google Fonts.

## 4. Key visual techniques

**Sketchy double-stroke boxes** — every card/box gets two overlapping borders instead of one: a base border with an asymmetric `border-radius` (mismatched px per corner, e.g. `16px 9px 14px 10px / 9px 15px 10px 16px`), plus a `::after` pseudo-element inset by a few px with a *different* asymmetric radius, ~45% opacity, rotated ~0.7deg. Reads as "the pencil didn't land in the same place twice." Pure CSS, no images.

**Wobble filter** — a single reusable SVG filter (`feTurbulence` + `feDisplacementMap`, low `baseFrequency`, `scale` ~3) applied via `filter: url(#wobble)` to small *decorative* SVGs only (icons, the headline underline swash, the "eye" illustration). Never applied to text or to anything containing text — displacement would blur/garble it.

**Hatch-fill placeholders** — item "photo" placeholders use a diagonal `repeating-linear-gradient` hatch instead of a solid color or gradient swatch (a sketch standing in for a photo not yet taken), same technique for the embed-widget thumbnails.

**Ruled paper background** — a very faint (`opacity: 0.12`) horizontal repeating-linear-gradient across the whole page, evoking loose-leaf paper, sitting behind all content via a `body::before` fixed layer.

## 5. Layout / content structure

Same seven sections across all three explored concepts (kept identical on purpose, to make the visual comparison apples-to-apples):

1. **Header** — hand-drawn star-scribble mark + "Wishlist" wordmark, sketchy "Sign in" button.
2. **Hero** — two-column: headline + subhead + CTA on the left; a fanned/rotated stack of 3 sketch item cards on the right (hatch thumbnail, name, price in a circled-pencil badge, star rating, one card showing a "Reserved" pill).
3. **"Surprise" strip** — a full-width callout built around a real product fact, not invented copy: reservations/pledges are hidden from the wishlist owner (see `src/app/[locale]/[username]/page.tsx:221-230`, `relationship.isOwner` gating). Copy: _"You'll never see who reserved what."_
4. **Features (3-up)** — "Make it yours" (appearance system), "Keep the surprise" (reservation privacy), "Find the right gift fast" (category/priority/price filters).
5. **Personalize showcase** — 5 mini preset cards mirroring the real `COLOR_PRESET_OPTIONS` (`light`, `rose`, `green`, `dark`, `minimal`) from `wishlist-appearance.ts`, so this section stays truthful to what the product actually offers.
6. **Embed section** — sketched browser-chrome mockup showing the embed widget in place, instead of describing it with text only (current landing page only describes it, see `src/app/[locale]/page.tsx:94-104`).
7. **Footer** — real footer (wordmark, one-line tagline, copyright) replacing the current single CTA line.

## 6. Open items for the implementation pass

- Decide whether the hand-drawn type/motif extends to `SiteHeader` sitewide (logged-in views too) or stays landing-page-only. Leaning toward sitewide for the header/logo at minimum, for brand consistency, but the dashboard/settings forms probably keep the plain UI type for legibility of form controls.
- Self-host `Architects Daughter` + `Patrick Hand` via `next/font/local`; remove the data-URI approach used in the mockup.
- Wire real translation keys (`next-intl`, `messages/en.json` + `messages/uk.json`) for all new copy — the mockup's copy is English-only placeholder text for the pitch.
- No new brand name was chosen — "Wishlist" stays as-is; only the visual identity changed.
