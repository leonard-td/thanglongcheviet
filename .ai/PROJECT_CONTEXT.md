# PROJECT_CONTEXT.md

| Field | Value |
|-------|-------|
| Name | Thăng Long Chè Việt (`tlcv` / `tlcv-prod` compose) |
| Type | Monorepo — marketing + headless commerce |
| FE | Nuxt 3 (`apps/web`) |
| BE | Medusa 2 (`apps/backend`) |
| Optional CMS | Strapi 5 (`strapi/`) |
| Node | ≥20 |
| Package manager (runtime) | **npm** |
| Active branch | `dev/be_medusajs_merge` |

## Purpose

Sell and present Vietnamese tea/heritage products and experiences; manage catalog, content, bookings, and customer flows.

## Runtime

- Dev: `./start.dev.sh` → `infra/docker-compose.yml` + `.env.dev`
- Prod local: `./start.prod.sh` → build + `infra/docker-compose.prod.yml`
- Remote: `./deploy.sh` ships `.medusa/server` + `.output`

## Workspace reality

| Path | Status |
|------|--------|
| `apps/web` | Active |
| `apps/backend` | Active |
| `strapi/` | Present; separate |
| `packages/*` | **Missing** |
| `apps/storefront` | **Missing** (README leftover) |
| `apps/design-copilot`, `ui-reference-tool` | Empty artifacts only |

## Authority hierarchy

1. Code + compose + `medusa-config.ts` + `nuxt.config.ts`  
2. `apps/backend/CLAUDE.md` + `.cursor/rules/architecture|coding-style|frontend|workflow.mdc` + responsive/i18n rules  
3. `.ai/*`  
4. `docs/*`, root `README`, `srs*` — verify before trusting  

See also: `PROJECT_MEMORY.md`, `ARCHITECTURE.md`, `ROADMAP.md`, `COMPONENT_GUIDE.md`.
