# SEO Audit — App (apps/backend, Medusa Admin dashboard at `/app`)

Audited 2026-08-07. Scope: the Medusa admin dashboard, mounted at `/app` and
publicly reachable on the same domain as the storefront (see routing below).

## Verdict: was not indexed-safe — this app should have *zero* SEO surface;
both gaps below are now fixed

The admin dashboard is an internal, login-gated tool. It doesn't need
titles/descriptions/OG tags the way the storefront does — the correct target
for "SEO" here is **"invisible to search engines"**, not "optimized." That
target isn't fully met yet.

## How it's exposed

`infra/nginx/conf.d/default.conf` proxies both prefixes to the same Medusa
backend, on the same public domain as the storefront:

- [`location /app/`](../infra/nginx/conf.d/default.conf#L32-L46) → the admin
  **dashboard UI** (what a browser/crawler renders and could index).
- [`location /admin/`](../infra/nginx/conf.d/default.conf#L48-L54) → the
  admin **REST API** (JSON, not html — low indexing risk on its own).

`apps/backend/medusa-config.ts` doesn't override the default Medusa admin
mount path, so the dashboard UI lives at `/app`, matching the nginx block.

## Critical — fixed 2026-08-07

- [x] **`robots.txt` disallowed the wrong path.** The storefront's
      [server/routes/robots.txt.ts](../apps/web/server/routes/robots.txt.ts#L9)
      emitted `Disallow: /admin` — but the actual browsable admin
      **dashboard** is served at `/app`, not `/admin` (see routing above).
      `/admin` is the JSON API, which crawlers have little reason to
      fetch/index anyway; the one path that matters, `/app`, was **not
      disallowed** and was technically crawlable/indexable.
      → Fixed: added `Disallow: /app` alongside the existing `/admin` line.

- [x] **No `noindex` safety net on the admin HTML itself.** Even with
      `robots.txt` fixed, `robots.txt` is only a crawl hint — pages already
      linked from elsewhere can still get indexed unless the page says so
      itself. The only HTML customization was
      `adminBrandingPlugin.transformIndexHtml` in
      [medusa-config.ts:31-45](../apps/backend/medusa-config.ts#L31-L45),
      which injected a `<title>` and favicon but no `<meta name="robots">`.
      → Fixed: that same `transformIndexHtml` hook now also injects
      `<meta name="robots" content="noindex, nofollow">` right after
      `<head>`, so every admin HTML response — dev and prod builds alike,
      since both go through this hook — self-declares non-indexable
      regardless of how it was reached.

## Baseline head tags — filled in 2026-08-07

The base `@medusajs/admin-bundler` template (confirmed against
`apps/backend/.medusa/client/index.html`) already ships `<meta charset>` and
`<meta name="viewport">`, but was otherwise bare: no `lang` attribute, no
description, no theme-color. Rounded these out in the same
`adminBrandingPlugin.transformIndexHtml` hook so the document is complete
even though it isn't meant to be indexed:

- [x] `<html lang="vi">` — was `<html>` with no language attribute.
- [x] `<meta name="description" content="Trang quản trị nội bộ Thăng Long
      Chè Việt — không dành cho công khai.">` — explicitly states internal
      purpose rather than leaving it empty (helps if a browser/OS surfaces
      it in a bookmark or tab preview).
- [x] `<meta name="theme-color" content="#c9a86c">` — matches the
      storefront's `primary-500` brand color
      ([apps/web/tailwind.config.js:20](../apps/web/tailwind.config.js#L20)),
      used by mobile browser chrome when the dashboard is pinned/bookmarked.
- [x] `<meta charset>` / `<meta viewport>` — already present in the base
      template, left untouched (no duplication needed).

## Correct as-is (don't over-invest here)

- [x] Single static `<title>Thăng Long Chè Việt</title>` for the whole SPA
      (medusa-config.ts) — appropriate; an internal dashboard doesn't need
      per-route dynamic titles, OG tags, or structured data, and adding any
      of that would be wasted effort.
- [x] Custom favicon wired via the same hook — cosmetic, not an SEO item,
      already handled.
- [x] Auth-gated: nothing renders without a valid session, which already
      limits (but does not eliminate — see above) accidental indexing.

## Not applicable / intentionally skipped

- Open Graph / Twitter Card tags — an admin login screen has no reason to
  render nicely when shared as a link; skip.
- Sitemap entry — the admin must never appear in `sitemap.xml`; confirmed it
  doesn't (`apps/web/server/routes/sitemap.xml.ts` only lists storefront
  routes).
- Canonical/hreflang — single-locale internal tool; not relevant.

## Remaining work

1. ~~Fix `robots.txt` to disallow `/app`.~~ Done.
2. ~~Add the `noindex` meta tag via `adminBrandingPlugin`.~~ Done.
3. If a production nginx config is added later (`infra/nginx/sites/*.conf`
   was referenced in a comment but doesn't exist in the repo yet), carry the
   same `/app` + `/admin` routing and confirm `robots.txt` is served from
   the same public domain there too.
