/**
 * Hand-drawn brand icon set — barrel (Stage 1 scaffolding).
 *
 * This barrel is intentionally empty for now. Stage 2α authors the icons and
 * exports them from here. The contract below is the spec those icons are
 * written against (see `docs/plan-sketch-consistency.md` §3).
 *
 * ## The icon contract
 *
 * Every hand-drawn (expressive) icon MUST follow these rules, mirrored from
 * the existing `wishlist-mark.tsx`:
 *
 * - `stroke="currentColor"` — ink inherits from context (brand `--sk-line`
 *   on marketing/app chrome, per-user resolved tokens on wishlist surfaces).
 *   NEVER a hardcoded hex.
 * - `fill="none"`.
 * - `strokeWidth="1.6"` (consistent with `.sketch`'s 1.6px ink stroke).
 * - `strokeLinecap="round"` and `strokeLinejoin="round"`.
 * - `aria-hidden="true"` whenever a text label sits beside the icon — the
 *   label is then the accessible name. Omit only when the icon alone IS the
 *   accessible label.
 * - Sized by the caller via `className`; the icon ships NO size class of its
 *   own.
 * - `className` merged through `cn()` from `@/lib/utils`.
 * - May carry `wobble-icon` (decorative / brand-carrying only — never on an
 *   icon paired with text, per the existing rule in globals.css).
 *
 * ## Role split
 *
 * - **Expressive → hand-drawn** (≥20px, decorative or brand-carrying):
 *   `Gift`, `Star`, `Sparkles`, `Palette`, `Handshake`, `Package`, `Lock`,
 *   `User`, `Filter`, `ExternalLink`, `Globe`, `Moon`, `Sun`.
 * - **Functional → stay lucide-react** (≤16px, an affordance inside a
 *   control): `Check`, `Copy`, `X`, `Chevron`, `MoreVertical`, `Pencil`,
 *   `Trash2`, `Archive`, `LogOut`, `Settings`, `LayoutDashboard`, `Grid2X2`,
 *   `List`, `UserPlus`, `UserMinus`, `ArrowLeft`, and the sonner status
 *   icons. These are never hand-drawn — at 16px wobble is illegible noise.
 */
export { Gift } from "./gift";
export { Star } from "./star";
export { Sparkles } from "./sparkles";
export { Palette } from "./palette";
export { Handshake } from "./handshake";
export { Package } from "./package";
export { Lock } from "./lock";
export { User } from "./user";
export { Filter } from "./filter";
export { ExternalLink } from "./external-link";
export { Globe } from "./globe";
export { Moon } from "./moon";
export { Sun } from "./sun";
