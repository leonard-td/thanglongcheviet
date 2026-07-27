# DECISIONS.md

| ID | Decision | Evidence |
|----|----------|----------|
| 001 | Nuxt customer storefront | `apps/web` |
| 002 | Medusa commerce + custom CMS | `apps/backend` modules |
| 003 | Nginx path routing single origin | `infra/nginx/conf.d/default.conf` |
| 004 | No Redis in Docker for this env | compose comments |
| 005 | Mount `/workspace` not `/app` | compose comments |
| 006 | Prod build on developer machine | `build-local.sh`, prod compose |
| 007 | SSR vs browser Medusa URL | `NUXT_MEDUSA_BACKEND_URL_SERVER` |
| 008 | JSON content fallbacks | `apps/web/content/` |
| 009 | Campaign TipTap = blog | `useBlog`, TipTap |
| 010 | Admin i18n + actions column | `CLAUDE.md` |
| 011 | Detail pages distinguish transport errors vs true 404 | `useBlog`/`useProducts` + `await useAsyncData` throw |
| 012 | Product description TipTap saves HTML string (not TipTap JSON) | `product-description` widget + storefront `v-html` |
| 013 | Homepage pillar hover = red border only | `HomePillarList` `.preview-link` |

**Superseded proposals:** Nest/Prisma, Lunar, Laravel, Next storefront, theme registry — docs only.
