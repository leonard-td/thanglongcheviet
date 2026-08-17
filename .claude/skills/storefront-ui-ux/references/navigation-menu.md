# Navigation & Mega Menu Rules

## Semantic entity distinction

Do not place concepts from different semantic levels next to each other without a clear, stated reason. Before adding or grouping a menu item, classify it as one of:

- **Category** — e.g. Trà, Gốm, Đồ thủ công, Đặc sản. A product taxonomy grouping.
- **Brand / Producer** — e.g. An Quang Caffé, a partner brand. Who makes/sells it.
- **Origin / Region** — e.g. Tây Hồ, Bát Tràng, Thái Nguyên, Huế. Where it's from.
- **Collection / Intent** — e.g. Quà doanh nghiệp, Quà du lịch, Quà Tết, Sản phẩm mới. A curated grouping by occasion/audience, cutting across categories.
- **Product** — a specific SKU.
- **Editorial content** — câu chuyện trà, làng nghề, nghệ nhân, di sản. Story/content, not transactional.

If unsure which bucket an existing or requested menu item belongs to, and that classification would change where it lives in the IA, ask the user rather than guessing (see "Never invent business meaning" in `design-principles.md`).

## Navigation is not a product database

The mega menu must not attempt to expose every SKU. As product count grows (10 → 50 → 500+), the menu must keep working without redesign. Prefer curated groupings (category, collection, "new," region) over exhaustive listing.

Conceptual example only — do not hard-code this structure if it doesn't match actual business data; verify against the real navigation data model first:

```text
SẢN PHẨM
├── Trà Việt
├── Gốm
├── Thủ công
└── Đặc sản

KHÁM PHÁ
├── Sản phẩm mới
├── Theo vùng miền
├── Quà Việt
└── Câu chuyện sản phẩm

DOANH NGHIỆP
└── Quà tặng doanh nghiệp
```

## Mega menu visual rules

Imagery is appropriate (cultural products are visual-discovery-driven), but must be controlled:

- Fixed item count / grid, not open-ended growth.
- Consistent column hierarchy across the menu.
- Consistent aspect ratio for all thumbnails at the same level — don't let items have arbitrarily different thumbnail sizes without an intentional design reason.
- Image fallback for missing/broken images — a broken image must never break the layout.
- Text wrapping must be handled for long Vietnamese labels (with dấu).
- Explicit hover state.
- Menu width and viewport clipping must be checked — the menu must not overflow or get clipped at real viewport widths.
- **Never** show a raw slug or database value as a display label (see "Vietnamese text" below).

## CMS navigation rules

When the menu is CMS-managed (`apps/backend/src/modules/navigation/**`, `apps/backend/src/admin/routes/navigation/**`):

- Prefer **entity-based linking** over asking a business admin to hand-type a URL. Business admins should not need to understand technical URL structure if the system already has the entity (product, category, article, page).
- Preferred conceptual model for a nav item, over a bare `Label / URL` pair:

```text
Link type
→ Category / Product / Article / Page / External URL

Entity
→ select corresponding item

Display label
→ optional override

Thumbnail
→ inherited by default
→ optional override
```

- Avoid broken-URL and broken-image risk: if the underlying entity is deleted or renamed, the nav item should degrade gracefully, not silently 404 or render a slug.
- Do not implement a large CMS refactor to reach this model if the current architecture (see `apps/backend/src/modules/navigation/service.ts`, `models/navigation-item.ts`, `nav-link-resolver.ts`) doesn't already support it. Instead: **document the gap, propose an incremental migration path, and stay out of scope** unless the user asks for that refactor specifically.

## Responsive & accessibility rules

- Verify desktop layout.
- Verify a smaller/mobile viewport — dropdown/mega menu must adapt (e.g. collapse to accordion or drawer), not just shrink.
- Keyboard/focus behavior: menu items reachable and operable via keyboard where relevant (open/close, arrow/tab navigation, escape to close).
- Hover AND click/tap behavior both need to work — don't assume hover-only on touch devices.

## Vietnamese text rules

- Always test with real diacritics (dấu), not placeholder ASCII.
- Test uppercase transforms — Vietnamese uppercase with dấu must still render correctly and not clip.
- Test line wrapping with realistically long Vietnamese labels.
- **Never** use an internal slug as a display label.

  - BAD: `che-sen`
  - GOOD: `Chè sen` (or whatever label the business has actually defined)

- If a slug is leaking into the presentation layer, treat it as a **data-model/presentation-layer bug**, not a typography problem — fix where the label is sourced/rendered, not with CSS.
- Do not invent or "correct" business terminology you're not certain about — ask if meaning is unclear.

## Scaling checklist (apply per navigation change)

Ask: does this still work with 10 items? 50 items? 500 products? multiple brands? multiple categories? If the answer is "only if someone manually curates it forever," flag that as a scalability concern in the review output, even if it's fine for the current data volume.
