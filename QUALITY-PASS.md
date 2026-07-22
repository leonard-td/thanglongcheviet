# Quality pass — Thăng Long Chè Việt (`fix/tlcv-quality-pass`)

Branch based on `dev/be_medusajs_merge`. Fixes from the quality review.

## Fixed

1. **`.env.example`** — removed git conflict markers; cleaned duplicate `HTTP_PORT`; VN defaults
2. **`useAsyncData` collision** — `site-bundle` vs `site-settings-dto`
3. **Navigation seed** — rewritten for `createNavigationItems` + real tea site URLs
4. **`setup-web-integration.mjs`** — navigation creates flat items; health wait ~3 min
5. **nginx** — added `/webhooks/` proxy for Telegram/Zalo care channels
6. **Cookies** — `sameSite: 'lax'`, `secure` in production (`customer_token`, `medusa_cart_id`)
7. **Auth SSR** — login/register use `authBaseUrl` (Docker-safe)
8. **Checkout** — optional city field; phone-based fallback email (no shared `khach@`)
9. **Related products** — `await productsAsync.execute()` instead of no-op
10. **Gallery filters** — tea / oolong / herbal / gift / space (match `gallery.json`)
11. **Locales** — removed salon/beauty copy; Order Now / tea branding
12. **Docker compose** — runs `seed-navigation.ts` on backend boot

## Still open (next)

- Real payment gateway (paymentUrl still null for online pay)
- Inventory from Medusa stock locations
- Link cart to customer after login
- Sitemap for Medusa catalog
- Sanitize product `v-html` description
- Strong secrets required in prod compose
