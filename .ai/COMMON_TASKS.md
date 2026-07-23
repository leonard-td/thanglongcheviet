# COMMON_TASKS.md

**Dev:** `./start.dev.sh` → open site + `/app`; setup script provisions keys.  
**Nuxt page:** `pages/<slug>.vue` + `i18n.pages` + locales + SEO.  
**Section:** `components/sections/` or `home/`.  
**Medusa data:** composable + `fetchMedusa('/store/...')`.  
**New module:** models/service/index → `medusa-config.ts` → migrate → API → admin + i18n.  
**Publishable key errors:** healthy backend + `node scripts/setup-web-integration.mjs`.  
**Build/deploy:** `./build-local.sh` then `./deploy.sh` or `./start.prod.sh`.  
**SEO:** `useSeoMeta`, hreflang helpers, `server/routes/sitemap.xml.ts` (legacy storefront call — known gap).  
**Responsive:** Tailwind + rule 01; home special-case in `pages/index.vue`.
