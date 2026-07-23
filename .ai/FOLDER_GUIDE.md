# FOLDER_GUIDE.md

| Path | Responsibility |
|------|----------------|
| `apps/web/` | Nuxt customer site |
| `apps/backend/` | Medusa API + Admin |
| `apps/design-copilot/`, `ui-reference-tool/` | Empty leftovers — ignore |
| `strapi/` | Standalone Strapi v5 |
| `infra/` | Compose + Nginx |
| `scripts/` | `setup-web-integration.mjs`, `watch-config.sh` |
| `docs/` | Plans (often outdated) |
| `.cursor/rules/` | Cursor rules |
| `.github/workflows/` | CI |
| `.ai/` | AI KB — start `AI_START_HERE.md` |
| `.ai/templates/` | Task templates |
| `packages/` | Missing |

### `apps/web/`

`pages/`, `layouts/`, `components/{layout,home,sections,widgets,product}/`, `composables/`, `content/`, `locales/`, `assets/css/`, `plugins/`, `server/routes/`, `utils/`, `nuxt.config.ts`

### `apps/backend/`

`medusa-config.ts`, `CLAUDE.md`, `src/modules/`, `src/api/{admin,store,webhooks}/`, `src/admin/routes/`, `src/scripts/`, `src/lib/backup/`

UI map: `COMPONENT_GUIDE.md`.
