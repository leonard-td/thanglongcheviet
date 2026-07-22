# Quality pass — Thăng Long Chè Việt (`fix/tlcv-quality-pass`)

Branch based on `dev/be_medusajs_merge`. Not pushed yet.

## Pass 1

1. `.env.example` — conflict markers removed
2. `useAsyncData` keys — `site-bundle` / `site-settings-dto`
3. Navigation seed + setup script fixed for flat NavigationItem API
4. Health wait ~3 min in setup script
5. nginx `/webhooks/`
6. Cookie `sameSite` + `secure` in prod
7. Auth SSR `authBaseUrl`
8. Checkout city field + safer email fallback
9. Related products `execute()`
10. Gallery filters + tea locale copy
11. Compose seeds navigation on boot

## Pass 2

12. **Cart → customer transfer** after login/register (`POST /store/carts/:id/customer`)
13. **`sanitizeHtml`** for product description `v-html`
14. **Sitemap** reads Medusa products + campaign posts (not Laravel `:8000`)
15. Cart page **`fetchCart` on mount** (no empty SSR flash)
16. Custom **`error.vue`** page
17. **robots.txt** disallows cart/account/admin/app
18. Removed dead Nitro proxy to Laravel `:8000`
19. Homepage **SEO meta**
20. Prod compose **refuses default JWT/COOKIE secrets** + seeds navigation
21. Removed salon discount IDs (`nail-gel` / `hair-color`) from services

## Pass 3

22. **Inventory-aware variants** — `manage_inventory` / `allow_backorder` → `inStock`
23. **Featured products** — `metadata.featured` (fallback first 6)
24. **Payment UX** — hide VNPay/Stripe until gateway wired (COD only)
25. Deleted dead **`useApi.ts`** (Laravel storefront proxy)
26. Promo banner — tea images, CTA → products
27. Header — **account** icon + i18n menu aria-labels
28. `@nuxt/image` domains for production host
29. i18n routes: `/about`, `/corporate-gifts`
30. **README** rewritten for Medusa + Nuxt + Docker
31. New carts auto-linked when customer already logged in

## Still open

- Online payment gateway redirect
- Inventory quantity from stock locations (needs inventory module query)
- Push `fix/tlcv-quality-pass` when ready
