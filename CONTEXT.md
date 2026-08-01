# Context

## Domain Terms

- **Wishlist**: a user's public list of desired items, including appearance settings and optional embedded widget settings.
- **Wishlist item**: an item inside a Wishlist. It may have price, currency, category, priority, URL, image, privacy, reservation, and widget visibility.
- **Wishlist owner**: the user who owns a Wishlist and can edit its items and settings.
- **Viewer**: the current signed-in or anonymous user looking at a Wishlist.
- **Mutual follower**: a Viewer and Wishlist owner who follow each other. Mutual followers can see private Wishlist items.
- **Wishlist appearance**: JSON-backed settings that control colors, banner/background display, fonts, item border style, and widget presentation.
- **Wishlist presentation**: the prepared view model for rendering a Wishlist page. It combines owner data, Viewer relationship, item query rules, resolved Wishlist appearance, and filter metadata.
- **Wishlist command context**: the server-side context for mutating a Wishlist. It provides the authenticated user id, ownership checks, owned Wishlist data, and shared command preconditions.
- **Wishlist item intake**: the process of turning a user's item draft, optional product metadata, category choice, and privacy settings into a valid Wishlist item command.
- **Wishlist settings state**: the normalized settings draft used by Appearance and Widget settings. It hides raw Wishlist appearance JSON defaults, theme mode rules, font choices, border choices, and widget layout settings.
- **Dashboard settings intake**: the authenticated server-side loading of the data needed by the settings page.
- **Wishlist filter state**: the normalized URL-backed state used to filter and sort Wishlist items. It owns category, currency, price range, sort order, and the query rules derived from those values.

## Brand identity vs. per-user appearance

The site's visual identity (see [`docs/design-landing-sketch-concept.md`](./docs/design-landing-sketch-concept.md) and [`docs/plan-sketch-redesign.md`](./docs/plan-sketch-redesign.md)) is split into two independent axes, and it's easy to break this by accident:

- **Structure & type** (double-stroke boxes, hatch fills, wobble icons, handwritten headings, ruled paper) is brand-fixed and applies to every surface, including a user's own themed wishlist page and embed.
- **Color** is per-user on the wishlist page and embed — it always comes from the resolved `wishlist-appearance.ts` tokens (`resolveWishlistAppearance`), never a hardcoded brand hex. Marketing/app chrome (header, footer, landing, settings, login, 404) uses the fixed brand `--sk-*` tokens instead.

The brand palette is also offered *as two of the user's own presets* (`paper`, `chalk` in `COLOR_PRESET_OPTIONS`), seeded as the default for newly created wishlists only — existing users' explicit choices are never rewritten. If you're touching a wishlist-page or embed component, sketch structure is fine to add unconditionally, but any color must trace back to the resolved per-user tokens, not a `--sk-*` variable.

## Sketch surface physics

One vocabulary answers every future "how should this look?" question on a sketch surface (see [`docs/plan-sketch-consistency.md`](./docs/plan-sketch-consistency.md) §1):

| Property | Rule | Replaces |
|---|---|---|
| **Depth** | overlap, rotation, and hatch — never a drop shadow | all `shadow-*` |
| **Emphasis** | stroke weight, circling, underlining — never fill or glow | elevation, blur halos |
| **Focus** | a second *drawn* stroke offset from the first | `focus-visible:ring-[3px]` blur ring |
| **Interaction** | "redraw" — the echo stroke shifts a fraction of a degree | `hover:shadow-lg` lift |
| **Radius** | exactly one owner per element (see §2, item 6) | `.sketch` and `itemBorderClass` fighting |

Three consequences to keep in mind:

- **No drop shadows, anywhere.** `shadow-*` is banned on sketch surfaces; depth comes from overlap, rotation, and hatch (`.sketch`/`.paper-lift` echo strokes, `.sketch-hatch`). This is the rule a future contributor is most likely to reintroduce.
- **Icon role split.** Expressive icons (≥20px, decorative or brand-carrying) are hand-drawn from `src/components/brand/icons/`; functional icons (≤16px affordances inside controls, plus the five sonner status icons) stay `lucide-react`. A hand-drawn icon is `stroke="currentColor"`, `fill="none"`, no hardcoded hex, `aria-hidden` when a text label sits beside it, and sized by the caller's className.
- **One radius owner per element.** `.sketch` owns the outer radii (its asymmetric `border-radius` and the `::after` echo). A user's `itemBorderClass` `rounded-*` applies only to inner image frames — never both on the same box, or the two fight.
