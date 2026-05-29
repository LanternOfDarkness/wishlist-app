## 2024-05-24 - Missing form associations and aria-labels on icon buttons
**Learning:** Found a pattern of missing `htmlFor` to `id` mapping in complex form component groups (e.g. `wishlist-filters`), and missing `aria-label`s on icon-only interactive elements (e.g. avatar triggers and copy link buttons).
**Action:** When adding new form elements or interactive UI, proactively ensure form labels have `htmlFor` attributes pointing to correctly IDs, and all icon buttons have an explicit `aria-label` or screen reader accessible text.
## 2026-05-29 - Add DialogDescription and Async Button Feedback to Modals
**Learning:** Shadcn UI modals (using Radix UI) require a `DialogDescription` inside `DialogContent` for accessibility compliance; omitting it results in screen reader issues and console warnings.
**Action:** Always include a visually hidden `<DialogDescription className="sr-only">` in modal headers if no visible description is needed.
