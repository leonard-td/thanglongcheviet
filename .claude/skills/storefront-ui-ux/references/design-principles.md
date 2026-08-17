# Design Principles

## Business identity

The storefront is not a single-category tea shop. It operates on two layers simultaneously:

- **Layer A — Own products**: tea (trà), chè, and tea-culture products. This is the current hero category and the business's own product line.
- **Layer B — Curated Vietnamese cultural commerce**: the site also acts as an intermediary/curator that introduces, tells the story of, and sells Vietnamese cultural products from other brands, craft villages (làng nghề), artisans (nghệ nhân), local producers, and partners. Future taxonomy may expand to gốm (ceramics), thủ công (handicraft), đặc sản vùng miền (regional specialties), quà lưu niệm (souvenirs), and other cultural products.

**Implication for every architectural decision**: never assume tea is the permanent, exclusive category. Tea is the first hero category, not a ceiling. Any IA choice (URL structure, menu grouping, category model) must not foreclose adding non-tea categories, brands, or origins later.

## Product philosophy: Product + Origin + People + Story

The long-term mental model for a product is not just image + name + price. It can carry:

- category
- origin / region
- brand
- artisan / producer
- collection
- cultural story
- product story

Phase 1 does not need to implement this full model. But no current navigation decision should make it harder to add these dimensions later (e.g., don't collapse "brand" and "category" into the same field just because today there's only one brand).

## Visual identity (baseline — do not redesign without explicit request)

Current style to preserve as-is unless the user asks otherwise:

- dark
- premium
- heritage
- Vietnamese cultural
- forest green
- charcoal / black
- muted gold
- lacquer / deep red
- photography-led, editorial composition

**Never** drift the site toward:

- generic SaaS
- Shopify clone
- bright marketplace
- modern tech-startup look
- Shopee-style e-commerce

**Vietnamese identity should come from**: material, photography, typography, craft, editorial composition, cultural context — not from decorative clichés: trống đồng (bronze drums), hoa sen (lotus), rồng (dragons), red/gold decorative patterns.

## Never invent business meaning

When encountering names like An Quang Caffé, Trà Việt, Thăng Long, a brand name, or a cultural region name, and the relationship between them is not already established in this conversation or the codebase's data model:

**Do not** silently conclude which one is a brand, a company, a collection, or a category.

**Ask the user** when that distinction would affect architecture (URL structure, menu placement, data model, taxonomy). Getting this wrong is expensive to unwind later — it's cheap to ask now.

## Scope discipline

This skill exists to make navigation clear, scalable, and consistent — not to license a storefront redesign. See `SKILL.md` for the current phase and the mandatory "Scope: / Not touching:" declaration before implementation. When in doubt about whether something is in scope, it isn't — ask.
