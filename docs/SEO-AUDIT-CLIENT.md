# SEO Audit — Client (apps/web, Nuxt storefront)

Audited 2026-08-07, fixes applied same day. Scope: `<title>`, `<meta
description>`, Open Graph, Twitter Card, canonical/hreflang, robots.txt,
sitemap.xml, structured data (JSON-LD) across all 29 routes in
`apps/web/pages/`.

## Verdict: all findings below fixed

## Already correct (untouched)

- [x] Global `<title>` template + `og:site_name` wired once in
      [app.vue](../apps/web/app.vue#L7-L10).
- [x] Bilingual `hreflang` alternate links (`vi`/`en`/`x-default`) applied
      site-wide via `useSeoHreflang()` in
      [app.vue](../apps/web/app.vue#L5) —
      [composables/useSeoHreflang.ts](../apps/web/composables/useSeoHreflang.ts).
- [x] `robots.txt` served dynamically, points to the sitemap —
      [server/routes/robots.txt.ts](../apps/web/server/routes/robots.txt.ts).
- [x] JSON-LD `Product` schema on product detail, `Article` schema on blog
      detail — [composables/useSeoStructuredData.ts](../apps/web/composables/useSeoStructuredData.ts).

## Critical — fixed

- [x] **Homepage had no SEO meta at all.** `pages/index.vue` only called
      `useHead()` for a background CSS hack. → Added a full `useSeoMeta`
      block (title/description from the admin-managed `site` settings —
      already on-brand — plus OG/Twitter, using the first hero slide as the
      share image).

- [x] **Duplicate site name in `<title>` on 16 pages.** They appended
      `${site.value.name}` themselves *and* the global `titleTemplate` in
      `app.vue` appended it again — e.g.
      `"Dịch vụ | Thăng Long Chè Việt | Thăng Long Chè Việt"`. → Dropped the
      manual suffix (and the now-unused `useSettings()` call) on all 16:
      `dich-vu`, `doi-ngu`, `gallery`, `gio-hang`, `lang-nghe`, `lien-he`,
      `tai-khoan`, `thanh-toan/ket-qua`, `tin-tuc/index`, `tra-cuu-don`,
      `trai-nghiem/index`, `san-pham/bo-suu-tap/[slug]`,
      `san-pham/chu-de/[slug]`, `san-pham/danh-muc/[slug]`,
      `tin-tuc/chu-de/[slug]`, `trai-nghiem/chu-de/[slug]`.
      Also fixed the same bug on `gioi-thieu.vue`, which duplicated it via a
      *different* source (`settings.value?.store_name` instead of
      `site.value.name`) — same symptom, different code path.

## High priority — fixed

- [x] **Meta description copy was off-brand** — a tea brand's `/dich-vu` and
      `/doi-ngu` pages read like a leftover beauty-salon template
      (`services.subtitle` = *"...dịch vụ làm đẹp..."*, `team.subtitle` =
      *"...ngành làm đẹp"*). → Reworded both in `locales/vi.json` **and**
      `locales/en.json` to reference tea, not beauty.
  - **Bonus find during the fix:** `locales/{vi,en}.json`'s `site.tagline`
    key (*"Nghệ thuật làm đẹp truyền thống"* / *"The Art of Traditional
    Beauty"*) had the identical leftover-template problem and is rendered
    live via `$t('site.tagline')` in `components/sections/ServicesOverview.vue`
    (currently not mounted on any page, but wrong content nonetheless — and
    it's what `pages/index.vue`'s new title now sources from the *correct*
    settings-based tagline instead, so the two didn't even agree with each
    other). → Corrected to *"Tinh hoa trà Việt"* / *"The Essence of
    Vietnamese Tea"* in both locale files.

- [x] **7 "coming soon" pages had a title only — no description.**
      `an-quang-caffe`, `di-san-tra-cu`, `du-an-doi-tac`, `nep-tra-viet`,
      `thu-vien-van-hoa`, `van-hoa-viet`, `vuon-an-quang`. → Added a
      `description` to each (page title + the existing `blog.comingSoon`
      i18n string), so search results no longer show an empty snippet.

- [x] **Product/category/collection/topic pages were missing `ogTitle`,
      `ogDescription`, `ogType`, `twitterCard`.** → Added the full
      OG/Twitter block (matching the blog-detail page's existing shape) to:
      `san-pham/[slug]`, `san-pham-list`, `san-pham/danh-muc/[slug]`,
      `san-pham/chu-de/[slug]`, `san-pham/bo-suu-tap/[slug]`,
      `tin-tuc/chu-de/[slug]`, `trai-nghiem/chu-de/[slug]`, `gioi-thieu`.

- [x] **`og:type` was never set anywhere.** → Added: `website` for regular
      and product pages (unhead's `useSeoMeta` type only accepts the
      standard OGP values — `product` isn't one of them, so the product
      detail page's `Product` JSON-LD is the correct place that distinction
      actually lives, see already-existing structured data), `article` for
      blog detail (event detail also uses `website` — schema.org's `Event`
      type is handled separately via JSON-LD, see below).

## Medium priority — fixed

- [x] **`gioi-thieu.vue` meta description duplicated the title** (`description:
      () => title.value`). → Now derives a real excerpt from the page's rich
      "about" content (`stripHtml(aboutHtml).slice(0, 160)`), falling back to
      the brand's on-brand `site.description` when that content is empty.

- [x] **Event detail page had no structured data.** `pages/trai-nghiem/[slug].vue`
      had the OG/Twitter block but no JSON-LD, unlike blog (`Article`) and
      product (`Product`). → Added `useEventStructuredData()` (schema.org
      `Event`: name, description, image, startDate/endDate, location,
      organizer) to
      [composables/useSeoStructuredData.ts](../apps/web/composables/useSeoStructuredData.ts)
      and wired it into the event detail page.

- [x] **`sitemap.xml` — worse than "Vietnamese-only": the dynamic half was
      silently dead.** The route fetched `GET /api/storefront/sitemap` for
      products/posts, but **that backend endpoint does not exist anywhere in
      the repo** — the `try/catch` was swallowing the failure every time, so
      in production the sitemap has only ever contained the ~11 static
      paths, zero products, zero blog posts, since the day this file was
      written. → Rewrote `server/routes/sitemap.xml.ts` to fetch straight
      from the real, already-working Medusa Store API endpoints (the same
      ones `useProducts`/`useBlog`/`useEvents`/`useTopics` use) instead of
      the nonexistent custom route:
  - Products, categories, collections (with real `updated_at` → `<lastmod>`).
  - Blog posts, blog topics.
  - Events, event topics.
  - Product topics.
  - Every entry now emits **both** the `vi` URL and its `/en` counterpart
    (matching `nuxt.config.ts`'s i18n `pages` map for translated segments,
    e.g. `/san-pham/{handle}` ↔ `/en/products/{handle}`; untranslated pages
    just get the `/en` prefix over the same path).
  - Static path list also corrected: dropped `/gio-hang` and `/tai-khoan`
    (private/utility pages — a cart or account page has no business being a
    search result, same reasoning `robots.txt` already applies elsewhere)
    and added the two real content pages that were missing entirely,
    `/gioi-thieu` and `/qua-tang-doanh-nghiep`, plus `/trai-nghiem`.

## Not done / follow-up worth knowing about

- The sitemap route now makes up to 8 parallel calls to the backend on every
  request with no caching (`defineCachedEventHandler` or similar). Crawlers
  don't hit `sitemap.xml` often, so this wasn't treated as urgent, but worth
  adding if it shows up in backend request logs.
- Blog posts' `<lastmod>` now falls back to `created_at` (the custom
  `campaign-posts` module route doesn't expose `updated_at`) — accurate for
  new posts, slightly stale if a post is edited long after publishing. Same
  for events. Not fixable from the frontend alone; would need the backend
  module to add/expose real `updated_at`.
