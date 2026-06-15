## 2024-05-24 - Missing form associations and aria-labels on icon buttons
**Learning:** Found a pattern of missing `htmlFor` to `id` mapping in complex form component groups (e.g. `wishlist-filters`), and missing `aria-label`s on icon-only interactive elements (e.g. avatar triggers and copy link buttons).
**Action:** When adding new form elements or interactive UI, proactively ensure form labels have `htmlFor` attributes pointing to correctly IDs, and all icon buttons have an explicit `aria-label` or screen reader accessible text.

## 2024-06-15 - Missing interactive pointer feedback on native checkboxes
**Learning:** Found a pattern where native `<input type="checkbox">` elements (and often their associated labels) lacked proper mouse interaction feedback, leaving users without visual indication that they are clickable or disabled.
**Action:** When adding or updating native checkboxes and their `<Label>`s, explicitly apply `cursor-pointer` (and `disabled:cursor-not-allowed` when applicable) Tailwind utility classes to override browser default styling and provide a better interactive micro-UX.
