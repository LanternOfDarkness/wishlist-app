## 2024-05-19 - Added Loader2 and sr-only DialogDescription to Create Wishlist Modal
**Learning:** Found a pattern of missing visual feedback for asynchronous button submissions and missing sr-only DialogDescription accessibility context within Radix UI dialog headers (which causes console warnings).
**Action:** When working on dialog components, always check if DialogDescription exists within DialogHeader and if missing, add an sr-only description mapping to the title. Verify loading states for async actions exist.
