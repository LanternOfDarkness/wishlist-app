## 2024-05-24 - Missing form associations and aria-labels on icon buttons
**Learning:** Found a pattern of missing `htmlFor` to `id` mapping in complex form component groups (e.g. `wishlist-filters`), and missing `aria-label`s on icon-only interactive elements (e.g. avatar triggers and copy link buttons).
**Action:** When adding new form elements or interactive UI, proactively ensure form labels have `htmlFor` attributes pointing to correctly IDs, and all icon buttons have an explicit `aria-label` or screen reader accessible text.

## 2026-06-29 - Missing pointer cursors on checkboxes and structural invalidity of peer disabled states
**Learning:** The UI contains native checkbox inputs that do not use `cursor-pointer`, which results in poor micro-UX. A common error when adding disabled states using tailwind `peer` (`peer-disabled:cursor-not-allowed`) is applying it when the label structure is separated from the input or precedes it in the DOM. The tailwind `peer` class works with the sibling combinator (`~`), which requires the target element to come *after* the peer element.
**Action:** Always add `cursor-pointer` to custom or native checkboxes and their labels to improve micro-UX. When styling a disabled label based on an input's state, only use `peer` if the label element follows the input in the DOM.
