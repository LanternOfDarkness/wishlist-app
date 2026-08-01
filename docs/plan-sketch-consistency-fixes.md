# Plan: fixes for the sketch consistency pass (phase 7 follow-up)

_Written 2026-08-02. Follows [`plan-sketch-consistency.md`](./plan-sketch-consistency.md), whose four
stages are implemented but uncommitted. This doc lists what the review found wrong in that
implementation and what to do about it._

At review time `npm run lint && npm test && npm run build` were all green, and the mechanical sweeps
were genuinely complete: zero `shadow-*`, zero `border-gray-*`, zero `ring-[3px]` remain in `src/`.
The items below are what those greps can't catch.

## Task list

| # | Task | Severity | Files |
|---|---|---|---|
| 1 | Dropdown `overflow` clips the `.sketch` echo | bug | `ui/dropdown-menu.tsx` |
| 2 | Sonner's own `::after` collides with `.sketch::after` | bug | `ui/sonner.tsx` |
| 3 | Dropdown item focus/hover is ~invisible | a11y regression | `ui/dropdown-menu.tsx` |
| 4 | Expressive icons render below their own size threshold | design contract | 14 call sites |
| 5 | Runtime regex class surgery on `itemBorderClass` | maintainability | `wishlist-appearance.ts` + 3 call sites |
| 6 | `.sketch-underline` is dead code | cleanup | `globals.css` |
| 7 | Stale "not yet applied" comment in `globals.css` | doc drift | `globals.css` |
| 8 | Leftover `aria-invalid:ring-*` blur halos | sweep miss | `ui/button.tsx`, `ui/input.tsx` |
| 9 | Page-height `.sketch` container wiggles on hover | design call | `[username]/page.tsx` |
| 10 | Checkbox deviation from the plan is undocumented | doc | `ui/checkbox.tsx` |
| 11 | Correct the `Loader2` count in the parent plan | doc | `plan-sketch-consistency.md` |

Tasks 1–3 block the commit. 4 and 9 need a design decision before they're actioned. 5–8, 10–11 are
cleanup that can ride along.

---

## 1. Dropdown `overflow` clips the `.sketch` echo stroke

**What's wrong.** [dropdown-menu.tsx:45](../src/components/ui/dropdown-menu.tsx#L45) applies `.sketch`
to an element that also carries `overflow-x-hidden overflow-y-auto`. `.sketch` sets
`position: relative`, which makes that element the containing block for its own `::after`; the echo
sits at `inset: -5px`, i.e. entirely outside the padding box, so the overflow clamp clips it away.
[dropdown-menu.tsx:233](../src/components/ui/dropdown-menu.tsx#L233) (`DropdownMenuSubContent`) has
the same problem via `overflow-hidden`.

**Effect.** The theme toggle, language switcher, and user nav panels render a single wobbly-radius
border — never the double stroke that is the whole point of `.sketch`. The class silently does half
its job, which is worse than not applying it, because a future contributor will read the class name
and assume the panel is already correct.

**Fix.** The overflow clamp is load-bearing (`max-h-(--radix-dropdown-menu-content-available-height)`
needs it for long menus), so the echo has to move outside it. Wrap the scrolling body in an inner
element and put `.sketch` on an unclipped outer wrapper, or give the echo its own absolutely
positioned sibling. Do not simply delete the overflow.

**Acceptance.** Open each of the three dropdowns at a narrow viewport with enough items to scroll:
the double stroke is visible on all four sides, and the menu still scrolls within the available
height.

## 2. Sonner's own `::after` collides with `.sketch::after`

**What's wrong.** [sonner.tsx](../src/components/ui/sonner.tsx) applies `.sketch` to the toast via
`toastOptions.classNames.toast`. Sonner ships its own rule in `node_modules/sonner/dist/styles.css`:

```css
[data-sonner-toast][data-expanded='true']::after {
  content: ''; position: absolute; left: 0; bottom: 100%;
  height: calc(var(--gap) + 1px); width: 100%;
}
```

That rule is **unlayered**, so it beats anything in `@layer components`. It's a gap-bridge that keeps
hover alive between stacked toasts. With two or more toasts expanded, `left`/`bottom`/`height`/`width`
override the echo's `inset: -5px` while `top` and `right` survive — the echo stops being a frame and
becomes a stray bordered bar floating above the toast.

**Fix.** Drop `.sketch` from `classNames.toast`. The `--normal-border: var(--sk-line)` and asymmetric
`--border-radius` overrides already in that file deliver the sketch look through sonner's own
supported theming hooks, and they don't touch `::after`. Keep `font-hand`.

**Acceptance.** Fire three toasts in quick succession and hover the stack: no stray stroke above any
toast, the gap-bridge hover behaviour still works (moving between stacked toasts doesn't dismiss
them), and each toast still has the ink border and asymmetric radius.

## 3. Dropdown item focus/hover is nearly invisible

**What's wrong.** The pass replaced `focus:bg-accent focus:text-accent-foreground` with
`focus:bg-(--sk-bg)` on `DropdownMenuItem`, `DropdownMenuCheckboxItem`, `DropdownMenuRadioItem`, and
`DropdownMenuSubTrigger` — but the panel itself is `bg-(--sk-surface)`. Those two tokens are adjacent
by design:

| Theme | Panel `--sk-surface` | Focus `--sk-bg` |
|---|---|---|
| light | `#FFFDF8` | `#FAF7EF` |
| dark | `#2C3035` | `#24272B` |

That's roughly 2% luminance separation. Keyboard navigation through a menu is the only way to know
which item is active, and it now has no perceptible highlight.

**Fix.** Emphasis on a sketch surface is stroke, not fill (plan §1) — so give the focused item a drawn
mark rather than hunting for a fill that contrasts. A left ink rule or an underline via
`.sketch-underline` (see task 6, which this would put to use) both fit the vocabulary. If a fill is
kept instead, it must clear 3:1 against `--sk-surface` in both themes.

**Acceptance.** Tab through every dropdown in both themes and both new presets; the active item is
unambiguous at a glance. Re-check under `forced-colors: active`.

## 4. Expressive icons render below their own size threshold

**What's wrong.** Plan §3 justifies hand-drawing only icons ≥20px, because "at 16px, hand-drawn
wobble is illegible noise." The split was then applied by *icon name* and not by *rendered size*.
Actual call sites:

| Size | Sites |
|---|---|
| 12px (`w-3`) | `Star` (priority pips), `Lock` (private badge) — [\[username\]/page.tsx:227,241](../src/app/[locale]/[username]/page.tsx#L227) |
| 14px (`h-3.5`) | `Star` — [hero-section.tsx:128](../src/components/landing/hero-section.tsx#L128) |
| 16px (`h-4 w-4`) | `Sparkles` ×2, `ExternalLink`, `Filter`, `Gift` ×2, `Globe`, `Moon`, `Sun` |
| ≥32px | `Gift` (embed fallback, `h-8`), `UserIcon` (avatar fallback, `w-12`) |

Only 2 of 14 sites clear the threshold the split was built around.

**Decision required** — pick one, don't split the difference:

- **(a) Resize the call sites** to ≥20px where layout allows, and move the ones that genuinely must
  stay small (the 12px priority pips especially) back to `lucide-react`.
- **(b) Accept hand-drawn at 16px**, verify legibility on a real display at both themes, and rewrite
  §3's threshold in the plan and [CONTEXT.md](../CONTEXT.md) so the stated rule matches the code.

Option (b) is cheaper but only honest if the 12px `Star`/`Lock` sites still go back to lucide — 12px
is not defensible under any threshold.

**Acceptance.** Every hand-drawn icon in the app renders at or above whichever threshold ends up
documented, and `CONTEXT.md`'s icon-role bullet states that number.

## 5. Replace the runtime regex class surgery on `itemBorderClass`

**What's wrong.** `appearance.itemBorderClass.replace(/rounded-\S+/g, "").trim()` appears three
times: [\[username\]/page.tsx:187](../src/app/[locale]/[username]/page.tsx#L187) and
[embed/\[username\]/page.tsx:64-65](../src/app/[locale]/embed/[username]/page.tsx#L64). It's string
surgery on a value that is already allow-list validated in
[wishlist-appearance.ts](../src/lib/wishlist-appearance.ts) — duplicated, untested, and it leaves a
double space where the class was removed.

**Fix.** Add a radius-free variant beside `itemBorderClass` in the presentation object (e.g.
`itemBorderClassNoRadius`, derived once from `ALLOWED_ITEM_BORDER_CLASSES`) and have all three call
sites read it. The radius-owner rule then lives in the module that owns the allow-list, where the
existing `wishlist-appearance.test.ts` suite can cover it.

**Acceptance.** A test asserts the derived value for every entry in `ALLOWED_ITEM_BORDER_CLASSES`;
no `.replace(` on a className anywhere in `src/app`.

## 6. `.sketch-underline` is dead code

Defined and documented in [globals.css](../src/app/globals.css), applied nowhere — the "Emphasis"
primitive from plan §1 never shipped. Either use it (task 3 is the natural home) or delete it. A
documented-but-unused utility invites a second, divergent implementation later.

## 7. Stale "not yet applied" comment in `globals.css`

The `@layer components` header comment still reads: _"the interaction utilities below were added:
`.sketch-focus`, `.paper-lift`, `.sketch-field`, `.sketch-underline` — still defined, not yet
applied, so no existing page changes visually."_ All four are applied now (`.sketch-underline`
excepted, per task 6). Rewrite it to describe the current state — this comment is the first thing a
contributor reads before touching the file.

## 8. Leftover `aria-invalid:ring-*` blur halos

[button.tsx:8](../src/components/ui/button.tsx#L8) and [input.tsx](../src/components/ui/input.tsx)
still carry `aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40`. The sweep in
plan §4 grepped for `ring-[3px]` specifically and missed these. A blurred ring is the exact thing
plan §1 bans; the invalid state should be a drawn stroke like focus is. Widen the sweep grep to
`ring-` generally.

## 9. Page-height `.sketch` container wiggles on hover

[\[username\]/page.tsx:80](../src/app/[locale]/[username]/page.tsx#L80) puts `.sketch` on a
`min-h-screen` container, so the `.sketch:hover::after` redraw nudge fires on any cursor movement
anywhere in the page and rotates a viewport-height frame. The redraw idiom was designed for cards.

**Fix options:** scope the hover nudge to smaller surfaces (e.g. a `.sketch-interactive` modifier
that `.paper-lift` cards opt into, leaving bare `.sketch` static), or drop `.sketch` from this
container in favour of a plain ink border. Needs an eyeball in the browser before choosing.

## 10. Document the checkbox deviation

Plan Stage 3γ says "apply `.sketch-field`" to form controls;
[checkbox.tsx](../src/components/ui/checkbox.tsx) applies `.sketch-focus` instead. That's the correct
call — `.sketch-field`'s 1.6px border has no effect on a native checkbox, and `accent-primary` (which
resolves through the per-user `--primary`) is what actually does the work. Add a code comment saying
so, or the next pass will "fix" it back.

## 11. Correct the `Loader2` count in the parent plan

[`plan-sketch-consistency.md`](./plan-sketch-consistency.md) §2 item 8 claims `Loader2` appears "16×
across 8 files." At the commit the plan was written against it was 5 sites in 4 files. The
implementation converted all 4 non-sonner sites correctly; only the inventory number is wrong. Fix
it so the doc isn't used as evidence of missed work later.

---

## Verification

```
npm run lint && npm test && npm run build
```

Manual matrix, unchanged from the parent plan — landing, header/footer, wishlist page, embed iframe,
settings, login, 404 × {light, dark} × {en, uk} × {360, 768, 1280} × {signed out, signed in}. Tasks
1–3 additionally need the dropdown/toast checks spelled out in their own acceptance lines, since none
of them is observable from a build.
