## 2024-05-24 - Missing form associations and aria-labels on icon buttons
**Learning:** Found a pattern of missing `htmlFor` to `id` mapping in complex form component groups (e.g. `wishlist-filters`), and missing `aria-label`s on icon-only interactive elements (e.g. avatar triggers and copy link buttons).
**Action:** When adding new form elements or interactive UI, proactively ensure form labels have `htmlFor` attributes pointing to correctly IDs, and all icon buttons have an explicit `aria-label` or screen reader accessible text.
## 2026-06-14 - Add DialogDescription for Accessibility
**Learning:** Shadcn UI/Radix UI Dialog components require a DialogDescription for screen readers to avoid accessibility warnings, even if the visual design doesn't call for one.
**Action:** Always add a visually hidden (<DialogDescription className="sr-only">) component to Dialogs when no visible description is needed.
