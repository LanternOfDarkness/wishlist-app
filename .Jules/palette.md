## 2024-05-24 - Missing form associations and aria-labels on icon buttons
**Learning:** Found a pattern of missing `htmlFor` to `id` mapping in complex form component groups (e.g. `wishlist-filters`), and missing `aria-label`s on icon-only interactive elements (e.g. avatar triggers and copy link buttons).
**Action:** When adding new form elements or interactive UI, proactively ensure form labels have `htmlFor` attributes pointing to correctly IDs, and all icon buttons have an explicit `aria-label` or screen reader accessible text.
## 2024-05-30 - Add Loader2 and DialogDescription to CreateWishlistModal
**Learning:** Adding a screen-reader only `DialogDescription` helps solve Radix UI accessibility warnings for dialogs without descriptions while keeping the UI clean. Also, standardizing on `Loader2` from `lucide-react` for button loading states creates consistent feedback.
**Action:** Always include a `DialogDescription` in dialogs (with `.sr-only` if visually redundant) and use `Loader2` with `animate-spin` class for button async states.
