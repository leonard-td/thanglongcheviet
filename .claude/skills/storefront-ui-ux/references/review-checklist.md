# Review Checklist

Use this before proposing changes (audit) and again before declaring a change done (verification).

## Pre-implementation audit — walk all 7 layers

1. **Product intent** — What business goal is this UI trying to achieve? What is it for?
2. **Information Architecture** — Are objects at the correct hierarchy level? Check whether product, category, brand, collection, service, content, and campaign are being mixed into one level (see `navigation-menu.md` entity distinctions).
3. **User flow** — What does the user see? What do they understand? What do they click? What do they expect after clicking?
4. **Interaction** — hover, click, open, close, keyboard, focus, responsive breakpoints, overflow, touch.
5. **Visual hierarchy** — typography, spacing, contrast, alignment, density, imagery, active/current state.
6. **Scalability** — Does this still work at 10 items? 50? 500 products? multiple brands? multiple categories? Or does it silently rely on today's small data volume?
7. **Admin/content management** — If CMS-driven: does the admin understand the field without dev knowledge? Are they forced to type technical/developer values? Is there broken-URL or broken-image risk? Is a preview needed before publishing?

If any layer surfaces a question whose wrong-guess answer would change architecture (e.g., "is this a brand or a category?"), **stop and ask the user** rather than proceeding on an assumption.

## Problem classification

Tag every finding as exactly one of:

- **Visual issue** — spacing, color, alignment, typography that doesn't affect comprehension or function.
- **UX issue** — user can't tell what to do, flow is confusing, expectation mismatch after an action.
- **Information Architecture issue** — wrong grouping/hierarchy of category/brand/origin/collection/content.
- **Data-model issue** — the UI is correctly rendering wrong or raw underlying data (e.g. a slug leaking as a label, a missing entity reference).

Then severity: **Critical / Major / Minor**, plus a one-line "why it matters" tying it to business or user impact — not just "looks off."

## Review output format (for any UI/menu analysis)

1. **What the user currently sees** — current mental model.
2. **Problems found** — Critical / Major / Minor, classified per above.
3. **Why it matters** — concrete user/business impact.
4. **Proposed direction** — the fix approach, not yet code.
5. **Scope for this iteration** — exactly what will change now.
6. **Deferred** — known issues intentionally left unfixed, and why.

## Scope guard (state before writing code)

```text
Scope:
- ...

Not touching:
- ...
```

Flag explicitly if the fix requires touching a shared component with effects outside navigation.

## Post-implementation verification

Manually verify (browser or available tooling), don't just assume from reading the diff:

- [ ] Desktop viewport
- [ ] Smaller/mobile viewport
- [ ] Broken or missing product/category images — layout doesn't break
- [ ] Long Vietnamese labels with dấu — no clipping, sensible wrapping
- [ ] Menu overflow/clipping at real viewport edges
- [ ] Hover behavior
- [ ] Click/tap behavior (not hover-only)
- [ ] Keyboard/focus behavior where relevant (tab order, escape to close, arrow navigation if applicable)
- [ ] No raw slugs or database values visible as labels
- [ ] Existing functionality outside the declared scope is unchanged
