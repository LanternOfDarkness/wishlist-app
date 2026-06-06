## 2024-05-24 - Missing form associations and aria-labels on icon buttons
**Learning:** Found a pattern of missing `htmlFor` to `id` mapping in complex form component groups (e.g. `wishlist-filters`), and missing `aria-label`s on icon-only interactive elements (e.g. avatar triggers and copy link buttons).
**Action:** When adding new form elements or interactive UI, proactively ensure form labels have `htmlFor` attributes pointing to correctly IDs, and all icon buttons have an explicit `aria-label` or screen reader accessible text.
## 2026-06-06 - Adding explicit cursor utility classes to inputs
**Learning:** Browsers do not automatically change the cursor to a pointer when hovering over native checkbox inputs. This can lead to a slightly disconnected micro-UX, especially when checkboxes are mixed with other interactive elements like buttons that do have pointer cursors.
**Action:** When implementing native checkboxes (or similar inputs) that do not use a wrapping component which already handles this, explicitly apply `cursor-pointer` and `disabled:cursor-not-allowed` utility classes to ensure consistent, intuitive visual feedback during interaction states.
