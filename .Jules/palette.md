## 2024-05-24 - Missing form associations and aria-labels on icon buttons
**Learning:** Found a pattern of missing `htmlFor` to `id` mapping in complex form component groups (e.g. `wishlist-filters`), and missing `aria-label`s on icon-only interactive elements (e.g. avatar triggers and copy link buttons).
**Action:** When adding new form elements or interactive UI, proactively ensure form labels have `htmlFor` attributes pointing to correctly IDs, and all icon buttons have an explicit `aria-label` or screen reader accessible text.
## 2024-05-21 - Dialog Accessibility and Loading States
**Learning:** Adding a visually hidden `<DialogDescription>` is required inside `<DialogContent>` for Radix UI dialogs to avoid console warnings and improve screen reader accessibility. Also, loading states in async buttons are better when they keep their text alongside the spinner to avoid layout shift and maintain accessible names. New UI dependencies must never be added.
**Action:** Always include a `.sr-only` description in Dialogs if no visible description is needed, use `Loader2` alongside text for button loading states, and strictly use existing dependencies.
