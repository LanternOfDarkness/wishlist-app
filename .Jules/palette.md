## 2024-05-24 - Missing form associations and aria-labels on icon buttons
**Learning:** Found a pattern of missing `htmlFor` to `id` mapping in complex form component groups (e.g. `wishlist-filters`), and missing `aria-label`s on icon-only interactive elements (e.g. avatar triggers and copy link buttons).
**Action:** When adding new form elements or interactive UI, proactively ensure form labels have `htmlFor` attributes pointing to correctly IDs, and all icon buttons have an explicit `aria-label` or screen reader accessible text.

## 2025-05-15 - Missing DialogDescription and Async Feedback
**Learning:** Found that Radix UI dialogs require a `DialogDescription` for accessibility (otherwise they throw console warnings and lack context for screen readers). Additionally, async submission buttons lacked a loading spinner.
**Action:** When adding or modifying `DialogContent`, always include a `DialogDescription` (can use `.sr-only` if no visible description is needed). Ensure async buttons use the `Loader2` component from `lucide-react` for visual feedback.
