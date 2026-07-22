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

## Still open

- Online payment gateway (`paymentUrl`)
- Real Medusa inventory / stock
- Stronger HTML sanitizer library if needed
- Full README rewrite for Medusa + Nuxt
