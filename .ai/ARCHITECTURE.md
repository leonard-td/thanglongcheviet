# ARCHITECTURE.md

> As-built from this repo. Not a redesign. Branch: `dev/be_medusajs_merge`.

---

## High-level

```
Browser → Nginx :HTTP_PORT
  ├─ /app /admin /store /auth /cloud /hooks /static /health → backend:9000 (Medusa)
  └─ /* → web:3000 (Nuxt)
```

Postgres 15. No Redis in compose. Optional Strapi separate (`strapi/`).

---

## Frontend (`apps/web`)

Nuxt 3.17, Vue 3, Tailwind + Modis CSS, `@nuxtjs/i18n` (vi default, en prefixed), `@nuxt/image`, VueUse, Lenis, Swiper.

Data: `useMedusaApi` → Medusa Store API; legacy `useApi` → `/api/storefront` proxy; JSON fallbacks in `content/`.

---

## Backend (`apps/backend`)

Medusa 2.17 + custom modules: `campaign`, `inquiry`, `event`, `card`, `navigation`, `care-channel`, `site-settings` + local file provider (`/static`).

APIs under `src/api/{store,admin,webhooks}`; admin UI under `src/admin/routes/`.

---

## Infra

| File | Role |
|------|------|
| `infra/docker-compose.yml` | Dev |
| `infra/docker-compose.prod.yml` | Prod (prebuilt artifacts) |
| `infra/nginx/conf.d/default.conf` | Path routing |

Build: `build-local.sh` → `.medusa/server` + `.output`. Deploy: `deploy.sh` / `start.prod.sh`.

---

## Non-architecture (do not assume)

NestJS/Prisma/BullMQ, Next storefront, Redis always-on, `packages/`, `templateRegistry` / `useTheme`.

See `DECISIONS.md`, `KNOWN_ISSUES.md`, `ROADMAP.md`.
