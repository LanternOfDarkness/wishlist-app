## 2024-05-14 - Radix UI Dialog Accessibility Pattern
**Learning:** Radix UI / Shadcn Dialog components will throw console warnings and hurt screen reader accessibility if a `DialogDescription` is not included inside the `DialogContent`. If no visible description is intended in the design, it is standard practice to still include it but hide it visually using a `.sr-only` class.
**Action:** When working with Dialog components, proactively check for missing `DialogDescription` elements and add them with `.sr-only` to ensure compliance and avoid console warnings.

## 2024-05-14 - Package Management Strict Boundaries
**Learning:** Adding new component libraries (like `@radix-ui/react-avatar`) as dependencies to fix an issue violates strict instructions in this repository and pollutes `package.json` and lockfiles. The project already leverages Shadcn UI and expects developers to use the existing tools or implement native solutions.
**Action:** Always use existing components, classes, and native browser APIs first. Only add a new UI dependency if explicitly instructed or absolutely unavoidable after all other paths fail. Always verify `package.json` and lockfile diffs before committing.
