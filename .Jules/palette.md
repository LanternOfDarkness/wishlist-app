## 2024-05-24 - Missing form associations and aria-labels on icon buttons
**Learning:** Found a pattern of missing `htmlFor` to `id` mapping in complex form component groups (e.g. `wishlist-filters`), and missing `aria-label`s on icon-only interactive elements (e.g. avatar triggers and copy link buttons).
**Action:** When adding new form elements or interactive UI, proactively ensure form labels have `htmlFor` attributes pointing to correctly IDs, and all icon buttons have an explicit `aria-label` or screen reader accessible text.
## 2025-02-28 - Create Wishlist Modal
**Learning:** Adding a screen reader-only `DialogDescription` prevents Radix UI accessibility warnings and improves screen reader experience for modals without visible descriptions. Showing a loading spinner within the action button creates a better micro-UX for users triggering async form submissions via Server Actions.
**Action:** Always verify Radix UI `Dialog` implementations to ensure they contain `DialogDescription` (`.sr-only` if not visual). Use visual loading states on submit buttons to indicate Server Action status.
