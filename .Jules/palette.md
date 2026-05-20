## 2024-05-20 - Accessible Dialog Descriptions and Loading States
**Learning:** Radix UI `Dialog` components issue console warnings and pose accessibility barriers if `DialogDescription` is missing. Users appreciate clear visual feedback during form submissions (e.g., loading spinners on buttons).
**Action:** Always include a `DialogDescription` in custom modals. Apply `Loader2` (with `animate-spin`) to submission buttons during async operations.
