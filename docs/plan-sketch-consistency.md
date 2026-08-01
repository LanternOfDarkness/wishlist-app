# Plan: sitewide UI/UX consistency pass ("Sketch", phase 7)

_Written 2026-08-02. Follows [`plan-sketch-redesign.md`](./plan-sketch-redesign.md), which established the
sketch identity. This plan closes the seams that pass left behind._

## 0. The problem, stated precisely

The redesign applied a hand-drawn identity to *frames and type*, but the app still mixes **three
incompatible visual metaphors**. That mix — not a shortage of assets — is what reads as inconsistent.

| Metaphor | Where it lives now | Why it fights the others |
|---|---|---|
| **Pencil on paper** (intended) | `.sketch`, `.sketch-hatch`, `.paper-rules`, handwriting fonts | — |
| **Material elevation** | `shadow-lg` on item cards, `shadow-md` on avatars, `shadow-sm` on filters/embed, `shadow-xs` on inputs/buttons, `shadow-lg` on dialogs, `backdrop-blur` glass panel | drop shadows imply a light source and floating panels; paper doesn't float |
| **Precise geometric vector** | ~30 distinct `lucide-react` icons, 2px uniform machine strokes | a CAD-perfect gift icon inside a wobbly hand-drawn frame |

Only two icons in the whole app are actually hand-drawn ([wishlist-mark.tsx](../src/components/brand/wishlist-mark.tsx)
and the 404 eye). Consistency comes from committing to one metaphor and making every surface obey it.

**This plan does not revisit the two-axis rule** from the redesign (structure brand-fixed, color
per-user on wishlist/embed — see [CONTEXT.md](../CONTEXT.md)). Every rule below inherits it: any new
stroke or fill on a wishlist surface resolves through the viewer's own appearance tokens, never a
`--sk-*` brand hex.

## 1. The medium's physics — the rule set

One vocabulary that answers every future "how should this look?" question:

| Property | Rule | Replaces |
|---|---|---|
| **Depth** | overlap, rotation, and hatch — never a drop shadow | all `shadow-*` |
| **Emphasis** | stroke weight, circling, underlining — never fill or glow | elevation, blur halos |
| **Focus** | a second *drawn* stroke offset from the first | `focus-visible:ring-[3px]` blur ring |
| **Interaction** | "redraw" — the echo stroke shifts a fraction of a degree | `hover:shadow-lg` lift |
| **Radius** | exactly one owner per element (see §2, item 6) | `.sketch` and `itemBorderClass` fighting |

## 2. Verified inventory (what's actually in the repo, checked 2026-08-02)

1. **Shadows — 8 distinct sites.** `shadow-lg` on item cards + the profile page's content container
   ([\[username\]/page.tsx:80,183](../src/app/[locale]/[username]/page.tsx#L80)), `shadow-md` on
   [wishlist-avatar.tsx:34](../src/components/wishlist/wishlist-avatar.tsx#L34), `shadow-sm` on
   [wishlist-filters.tsx:62](../src/components/wishlist-filters.tsx#L62) and the embed root/tiles,
   `shadow-xs` in [input.tsx:11](../src/components/ui/input.tsx#L11) and `button.tsx`'s `outline`
   variant, `shadow-lg` in [dialog.tsx:64](../src/components/ui/dialog.tsx#L64) and `alert-dialog.tsx`.
2. **~30 lucide icons.** Bigger than a "just redraw them" job — resolved by the role split in §3.
3. **Focus is a blur halo.** `focus-visible:ring-[3px]` in [button.tsx:8](../src/components/ui/button.tsx#L8)
   and [input.tsx:12](../src/components/ui/input.tsx#L12); `focus:ring-2 focus:ring-offset-2` on six
   raw `<select>` elements.
4. **`border-gray-300` is hardcoded on six checkboxes** (settings-form ×2, wishlist-filters,
   add-item-modal, reserve-item-modal, embed-widget). It ignores dark mode *and* the per-user
   appearance — a real defect, not just a style seam.
5. **No shared `Select` or `Checkbox` component.** The same ~200-character `<select>` className is
   duplicated in six places (add-item-modal ×2, wishlist-filters ×2, settings-form ×3). Any styling
   rule has six places to drift.
6. **Radius collision.** Item cards carry both `.sketch` (asymmetric, wobbly) and the user's
   `itemBorderClass` (uniform `rounded-lg`). These fight — it already caused the image-overshoot bug
   fixed in `1aa8467`.
7. **Unstyled overlays.** [dialog.tsx](../src/components/ui/dialog.tsx), `alert-dialog.tsx`,
   `dropdown-menu.tsx`, and [sonner.tsx](../src/components/ui/sonner.tsx) are stock shadcn — never
   touched by any redesign phase.
8. **Generic empty/loading states.** The no-items state is `border-2 border-dashed rounded-xl`
   (reads as a wireframe placeholder); `Loader2` + `animate-spin` appears 16× across 8 files.
9. **The filters panel never got a sketch pass** — still `bg-card border rounded-lg shadow-sm`.

## 3. The icon role split

Redrawing all 30 icons is neither necessary nor wise: at 16px, hand-drawn wobble is illegible noise.
Split by **role**, mirroring the redesign's existing form-control legibility rule:

- **Expressive → hand-drawn** (≥20px, decorative or brand-carrying, ~13 icons):
  `Gift`, `Star`, `Sparkles`, `Palette`, `Handshake`, `Package`, `Lock`, `User`, `Filter`,
  `ExternalLink`, `Globe`, `Moon`, `Sun`.
- **Functional → stays lucide** (≤16px, an affordance inside a control, ~17 icons):
  `Check`, `Copy`, `XIcon`, `CheckIcon`, `ChevronRightIcon`, `CircleIcon`, `MoreVertical`, `Pencil`,
  `Trash2`, `Archive`, `LogOut`, `Settings`, `LayoutDashboard`, `Grid2X2`, `List`, `UserPlus`,
  `UserMinus`, `ArrowLeft`, and the five sonner status icons.

Every hand-drawn icon: `stroke="currentColor"`, `fill="none"`, no hardcoded hex (so per-user color
flows through), `aria-hidden` when a text label sits beside it, sized by the caller's className.

## 4. Sequencing

`globals.css` is owned by **Stage 1 alone**. Every later stage only *applies* classes — that's what
keeps parallel agents from colliding in one file, the failure mode most likely to break this.

| Stage | Agents | Lands | Owns these files |
|---|---|---|---|
| 1 | solo | every new CSS utility + icon scaffolding | `globals.css`, `src/components/brand/icons/` |
| 2 | α + β in parallel | α: hand-drawn icon set, swapped in · β: overlays + ui primitives | α: `brand/icons/*`, feature components · β: `ui/dialog`, `ui/alert-dialog`, `ui/sonner`, `ui/dropdown-menu`, `ui/button`, `ui/input` |
| 3 | γ + δ in parallel | γ: shared form controls · δ: depth, surfaces, radius | γ: new `ui/select`, `ui/checkbox`, settings-form, filters, modals, embed-widget · δ: `[username]/page`, `embed/[username]/page`, `wishlist-avatar`, `wishlist-banner`, `wishlist-item-image` |
| 4 | solo | motion, loading states, docs, final sweep | motion classNames, `CONTEXT.md`, this doc |

---

## Stage 1 — Foundations (CSS vocabulary + icon scaffolding)

**Owns `globals.css` exclusively.** Defines every utility later stages consume; applies almost none
of them, so visual change is near-zero.

New utilities in `@layer components`:

- `.sketch-focus` — focus treated as a *third* drawn stroke: on `:focus-visible`, an offset outline
  in `--sk-line` (or the overridable per-user var) at a different asymmetric radius. Must remain
  clearly visible on `paper` **and** `chalk` backgrounds.
- `.paper-lift` — the shadow replacement. No `box-shadow`; depth via a slightly rotated, offset
  second edge. Hover state shifts the echo stroke's rotation (~0.4deg) instead of raising elevation.
- `.sketch-field` — control chrome that keeps control *geometry*: real height, real hit area, real
  sans-serif type at 14px (the redesign's legibility rule stands), but a 1.6px ink border and
  `.sketch-focus` instead of shadcn's ring. This is what closes the "settings looks half-finished"
  seam without hurting legibility.
- `.sketch-underline` — the circling/underlining emphasis primitive.

Scaffold `src/components/brand/icons/` with an `index.ts` barrel and a short README-style comment
fixing the icon contract from §3 (currentColor, no hex, aria-hidden, caller-sized).

**Acceptance:** `npm run lint && npm test && npm run build` green; no existing page changes visually
(new classes defined, not yet applied).

---

## Stage 2 — α: expressive icon set · β: overlays & primitives

**α (icons).** Author the 13 expressive icons per §3, then swap their usages. Keep every existing
`aria-*`/`alt` contract and size className exactly as-is — this is a glyph swap, not a layout change.
Never apply `.wobble-icon` to anything containing text (existing rule).

**β (overlays & ui primitives).** `Dialog`/`AlertDialog` → `.sketch` frame, drop `shadow-lg`, replace
the zoom animation with a subtler fade (a zoom implies a 3D camera). `Toaster` → sketch border +
`font-hand`, keep the five status icons geometric (they're functional). `DropdownMenu` → sketch panel,
functional icons unchanged. `Button`/`Input` → `.sketch-focus` replaces `focus-visible:ring-[3px]`;
remove `shadow-xs`. **Do not touch the `sketch` button variant's colors** — the wishlist page feeds it
per-user tokens.

**Acceptance:** all three green; keyboard focus visible on every interactive element in both new
presets; no `aria-*` or tab-order changes.

---

## Stage 3 — γ: form controls · δ: depth & surfaces

**γ (form controls).** Create `ui/select.tsx` and `ui/checkbox.tsx` as the single home for what is
currently duplicated six times each. Replace all six raw `<select>`s and all six raw checkboxes.
**Kill `border-gray-300`** — it must resolve through `--border`/the per-user token (item 4 above is a
defect, and fixing it is the point of this stage, not a side effect). Apply `.sketch-field`. Every
form must still submit: no `name=`, `value=`, or hidden-input changes.

**δ (depth & surfaces).** Remove every `shadow-*` from item cards, the content container, avatar,
banner, filters panel, and embed; replace with `.paper-lift`/ink borders per §1. Drop the
`bg-background/80 backdrop-blur-sm` glass panel for a solid paper fill + ink border. Rewrite the
empty state in the sketch language. Resolve the radius collision (item 6): one owner per element,
documented in a code comment so it can't regress.

**Acceptance:** all three green; every settings form still saves (profile, share link, widget);
all seven color presets still legible; embed unchanged in size/layout.

---

## Stage 4 — Motion, loading, docs, sweep

- **Redraw-on-interact**: hover/active nudge the `::after` echo stroke. All motion behind
  `@media (prefers-reduced-motion: reduce)`.
- **Loading**: replace the geometric `Loader2` spin with a sketch-native indicator (e.g. a
  progressively drawn stroke). 16 sites, 8 files.
- **Docs**: fold §1's physics table into [CONTEXT.md](../CONTEXT.md) beside the two-axis rule — a
  future contributor needs both to avoid reintroducing a drop shadow.
- **Sweep**: grep for any surviving `shadow-*`, `border-gray-*`, or `ring-[3px]`; confirm
  `forced-colors: active` still shows borders; re-check contrast on `paper`/`chalk`.

## Verification (every stage)

```
npm run lint && npm test && npm run build
```

Manual matrix — landing, header/footer, wishlist page, embed iframe, settings, login, 404 ×
{light, dark} × {en, uk} × {360, 768, 1280} × {signed out, signed in}.

## Risks

| Risk | Mitigation |
|---|---|
| Parallel agents collide in `globals.css` | Stage 1 owns it exclusively; later stages only apply classes |
| Removing focus rings hurts a11y | `.sketch-focus` is defined *before* any ring is removed (Stage 1 precedes Stage 2β); explicit acceptance check on both new presets |
| Shared `Select`/`Checkbox` breaks form submission | No `name`/`value`/hidden-input changes; every form manually exercised |
| Hand-drawn icons illegible at small sizes | Role split (§3) keeps ≤16px affordances geometric |
| Motion causes vestibular discomfort | All motion gated behind `prefers-reduced-motion` |
| Sketch chrome on form fields hurts legibility | Only *chrome* changes; geometry, hit area, and 14px sans type are explicitly preserved |
