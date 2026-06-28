## 2024-05-24 - Missing form associations and aria-labels on icon buttons
**Learning:** Found a pattern of missing `htmlFor` to `id` mapping in complex form component groups (e.g. `wishlist-filters`), and missing `aria-label`s on icon-only interactive elements (e.g. avatar triggers and copy link buttons).
**Action:** When adding new form elements or interactive UI, proactively ensure form labels have `htmlFor` attributes pointing to correctly IDs, and all icon buttons have an explicit `aria-label` or screen reader accessible text.
## 2026-06-28 - Added cursor-pointer to checkboxes and their labels
**Learning:** Added  to various checkboxes and their labels across forms and modals. Used Tailwind's  state for elegant  labeling, noting that  requires the target to follow the input in DOM.
**Action:** Consistently use  on checkable inputs, and apply  attributes properly for labels to enhance visual feedback.
## 2024-05-24 - Added cursor-pointer to checkboxes and their labels
**Learning:** Added cursor-pointer to various checkboxes and their labels across forms and modals. Used Tailwind's peer state for elegant disabled labeling, noting that peer requires the target to follow the input in DOM.
**Action:** Consistently use cursor-pointer on checkable inputs, and apply peer-disabled attributes properly for labels to enhance visual feedback.
