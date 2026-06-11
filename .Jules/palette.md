## 2024-05-24 - Missing form associations and aria-labels on icon buttons
**Learning:** Found a pattern of missing `htmlFor` to `id` mapping in complex form component groups (e.g. `wishlist-filters`), and missing `aria-label`s on icon-only interactive elements (e.g. avatar triggers and copy link buttons).
**Action:** When adding new form elements or interactive UI, proactively ensure form labels have `htmlFor` attributes pointing to correctly IDs, and all icon buttons have an explicit `aria-label` or screen reader accessible text.
## 2025-06-11 - Radix UI Dialog Accessibility Pattern
**Learning:** Radix UI Dialogs in this application require a `DialogDescription` to prevent accessibility warnings and provide context for screen readers. Sometimes, visual descriptions aren't needed.
**Action:** Use `<DialogDescription className="sr-only">` within `DialogContent` to satisfy screen reader requirements and avoid console warnings when a visible description is not necessary.
