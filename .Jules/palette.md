## 2024-05-24 - Missing form associations and aria-labels on icon buttons
**Learning:** Found a pattern of missing `htmlFor` to `id` mapping in complex form component groups (e.g. `wishlist-filters`), and missing `aria-label`s on icon-only interactive elements (e.g. avatar triggers and copy link buttons).
**Action:** When adding new form elements or interactive UI, proactively ensure form labels have `htmlFor` attributes pointing to correctly IDs, and all icon buttons have an explicit `aria-label` or screen reader accessible text.
## 2024-05-24 - Hardcoded localization in accessible labels
**Learning:** Found that hardcoded text in  or  attributes on interactive elements breaks accessibility for non-native users and ignores i18n configurations.
**Action:** Always use translation hooks (`useTranslations`) for `aria-label`, `title`, and toast notifications to ensure a fully localized and accessible experience.
## 2024-05-24 - Hardcoded localization in accessible labels
**Learning:** Found that hardcoded text in `aria-label` or `title` attributes on interactive elements breaks accessibility for non-native users and ignores i18n configurations.
**Action:** Always use translation hooks (`useTranslations`) for `aria-label`, `title`, and toast notifications to ensure a fully localized and accessible experience.
