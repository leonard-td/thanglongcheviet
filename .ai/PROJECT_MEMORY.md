# PROJECT_MEMORY

> Read in under 5 minutes. Canonical short memory for all AIs.  
> Details: `ARCHITECTURE.md`, `DECISIONS.md`, `ROADMAP.md`, `KNOWN_ISSUES.md`.

---

## Project purpose

Public website + headless commerce for **Thăng Long Chè Việt** (tea, heritage, experiences, corporate gifts).

## Business domain

- Bilingual marketing site (vi default, en)  
- Product catalog, cart, account, order lookup  
- Content: campaign posts/topics (blog), cards, events  
- Bookings / contact / care channels (Zalo, Telegram)  
- Admin via Medusa Admin custom routes  

## Active git branch

**Working branch:** `dev/be_medusajs_merge` (`origin/dev/be_medusajs_merge`).

Not current work unless asked: `dev/tlcv-v01`.

Related: `dev/be_medusajs`, `dev/be_medusajs_v2`, `feat/tlcv-post-merge-quality-pass`.

## Current phase (from code, not old plans)

**Live:** Nuxt storefront + Medusa backend with substantial custom modules, Docker dev/prod, artifact deploy.

**Not in tree:** NestJS API, Prisma, Laravel, Lunar, Next storefront, shared `packages/`.

## Architecture

Nginx single origin → Nuxt (`/`) + Medusa (`/app`, `/admin`, `/store`, `/auth`, `/static`).  
Postgres 15. No Redis in compose. Optional Strapi separate.

Custom Medusa modules: `campaign`, `card`, `navigation`, `site-settings`, `inquiry`, `event`, `care-channel`.

## Dependencies (high level)

| Area | Tech |
|------|------|
| Web | Nuxt 3.17, Vue 3, Tailwind 3, @nuxtjs/i18n 9, @nuxt/image, Swiper, Lenis |
| Backend | Medusa 2.17, TipTap, Zod, React admin extensions |
| Ops | Docker `node:20`, nginx 1.25, postgres 15, npm workspaces + turbo |

## Important folders

| Path | Role |
|------|------|
| `apps/web` | Customer Nuxt app |
| `apps/backend` | Medusa API + admin |
| `apps/web/components/{layout,home,sections,widgets,product}` | UI |
| `apps/web/composables` | Data/UI logic |
| `apps/web/content` | JSON fallbacks |
| `apps/web/locales` | vi/en UI strings |
| `apps/backend/src/modules` | Custom domain modules |
| `apps/backend/src/admin/routes` | Admin pages |
| `infra/` | Compose + nginx |
| `scripts/setup-web-integration.mjs` | Publishable key / region |
| `strapi/` | Optional CMS |
| `.ai/` | This knowledge base |

## Known limitations

- Dual API clients: `useMedusaApi` (Medusa) vs `useApi` (`/api/storefront` legacy)  
- Sitemap still calls legacy `/api/storefront/sitemap`  
- Strapi not in main compose  
- Empty leftover dirs: `apps/design-copilot`, `apps/ui-reference-tool`  
- Root README + many `docs/` / old Cursor Nest rules are **stale**  

## Technical debt

- `.env.example` may have merge conflict markers  
- `pnpm-workspace.yaml` / lockfile coexist with npm (Docker uses npm)  
- `packages/` missing despite workspace glob  
- Two deploy narratives (root `deploy.sh` vs GH Action)  
- Featured products = `slice(0, 6)` placeholder  
- Modis/bootstrap CSS + Tailwind coexist  

## Current TODO (repo signals)

1. Fix env example conflicts if present  
2. Align README + Cursor rules to Medusa+Nuxt  
3. Medusa-backed sitemap  
4. Clarify/remove dual storefront API  
5. Clean empty design-tool apps  
6. Reconcile deploy docs  

## Future roadmap

See `ROADMAP.md`. Treat `docs/PLAN.md` / `srs.md` as proposals, not current architecture.

## Important decisions

1. Nuxt is the customer site; Medusa Admin is internal CMS  
2. No Redis in this Docker env (boot hang history)  
3. Mount at `/workspace`, never `/app`  
4. Prod builds on developer machine; server runs artifacts  
5. SSR Medusa URL may differ from browser URL  
6. Campaign TipTap = blog engine  
7. Admin i18n + actions-column rules mandatory (`CLAUDE.md`)  
