## 2024-05-24 - Missing form associations and aria-labels on icon buttons
**Learning:** Found a pattern of missing `htmlFor` to `id` mapping in complex form component groups (e.g. `wishlist-filters`), and missing `aria-label`s on icon-only interactive elements (e.g. avatar triggers and copy link buttons).
**Action:** When adding new form elements or interactive UI, proactively ensure form labels have `htmlFor` attributes pointing to correctly IDs, and all icon buttons have an explicit `aria-label` or screen reader accessible text.

## 2024-05-24 - Cursor pointer on checkboxes
**Learning:** By default, checkboxes and their labels do not have a `cursor-pointer` style, which can make them feel less interactive.
**Action:** When adding checkboxes, ensure both the input and the label have the `cursor-pointer` class. If disabled, add the `disabled:cursor-not-allowed` class.
