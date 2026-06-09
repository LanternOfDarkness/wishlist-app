## 2024-05-24 - Missing form associations and aria-labels on icon buttons
**Learning:** Found a pattern of missing `htmlFor` to `id` mapping in complex form component groups (e.g. `wishlist-filters`), and missing `aria-label`s on icon-only interactive elements (e.g. avatar triggers and copy link buttons).
**Action:** When adding new form elements or interactive UI, proactively ensure form labels have `htmlFor` attributes pointing to correctly IDs, and all icon buttons have an explicit `aria-label` or screen reader accessible text.

## 2024-06-09 - Loading Indicators and Form Checkboxes
**Learning:** Found that checkboxes lack proper cursor feedback for hover/disabled states by default, and Radix UI dialogs throw a11y console warnings without a screen-reader `<DialogDescription>`.
**Action:** Always add `cursor-pointer disabled:cursor-not-allowed` to native checkboxes and ensure Radix `<DialogContent>` has a `<DialogDescription className="sr-only">` if no visible description is needed.
