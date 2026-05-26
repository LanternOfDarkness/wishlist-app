## 2024-05-24 - Missing form associations and aria-labels on icon buttons
**Learning:** Found a pattern of missing `htmlFor` to `id` mapping in complex form component groups (e.g. `wishlist-filters`), and missing `aria-label`s on icon-only interactive elements (e.g. avatar triggers and copy link buttons).
**Action:** When adding new form elements or interactive UI, proactively ensure form labels have `htmlFor` attributes pointing to correctly IDs, and all icon buttons have an explicit `aria-label` or screen reader accessible text.

## 2026-05-26 - Adding standard loading feedback to form buttons
**Learning:** Found a pattern of text-only disabled states during form submissions (e.g. "Saving..."). Users, especially on slower connections or devices without high framerates, may miss text changes. Adding standard visual loading cues, like Shadcn's animated `Loader2` icon, drastically improves interaction feedback and provides a universal indicator that a process is running.
**Action:** When updating or creating forms with asynchronous submission, always pair text state changes with an animated visual indicator (like `Loader2` with `animate-spin`) inside the submit button to establish a consistent feedback loop across the application.
