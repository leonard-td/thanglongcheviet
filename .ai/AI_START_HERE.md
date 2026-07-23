# AI_START_HERE

> **Every AI assistant must read this file before coding.**

Then read: `PROJECT_MEMORY.md` → `SMART_CONTEXT.md` → task template under `templates/`.

---

## What this project is

**Thăng Long Chè Việt** — Vietnamese tea / cultural heritage brand:

| Layer | Path | Stack |
|-------|------|--------|
| Customer site | `apps/web` | **Nuxt 3** + Vue 3 + Tailwind + i18n |
| Commerce + admin CMS | `apps/backend` | **Medusa v2.17** + custom modules |
| Optional CMS | `strapi/` | Strapi 5 (not in main Docker Compose) |
| Infra | `infra/` | Docker Compose + Nginx (single HTTP port) |

Site URL default: `https://thanglongcheviet.vn`.

**Active git branch for current work:** `dev/be_medusajs_merge` (tracks `origin/dev/be_medusajs_merge`).  
Do **not** assume `dev/tlcv-v01` unless the human asks for that branch.

---

## Navigation (read order)

1. `.ai/AI_START_HERE.md` ← you are here  
2. `.ai/PROJECT_MEMORY.md` — 5-minute memory  
3. `.ai/SMART_CONTEXT.md` — short prompt → files  
4. `.ai/ARCHITECTURE.md` + `STACK.md` — as-built system  
5. `.ai/FOLDER_GUIDE.md` + `COMPONENT_GUIDE.md`  
6. `.ai/CODE_STYLE.md` + `BUSINESS_RULES.md` + `COMMON_TASKS.md`  
7. `.ai/templates/<TASK>.md` when applicable  
8. Root `AGENTS.md` for tool roles  

**Source of truth:** code + `infra/docker-compose*.yml` + `nuxt.config.ts` + `medusa-config.ts`.  
**Not truth alone:** root `README.md`, `docs/ARCHITECTURE.md` / `PLAN.md` (Nest/salon plans), `srs.md` (Next.js) — see `KNOWN_ISSUES.md`.

---

## Architecture (one glance)

```
Browser → Nginx :HTTP_PORT
            ├─ /app /admin /store /auth /static /health → Medusa :9000
            └─ /* → Nuxt :3000
```

There is **no** NestJS `apps/api`, **no** Next.js storefront, **no** `packages/shared` in the live tree.

---

## Hard rules

**Always**

- Read this file + `PROJECT_MEMORY.md` before coding  
- Preserve architecture; reuse components; minimal diffs  
- Mobile-first + vi/en i18n  
- Medusa admin: follow `apps/backend/CLAUDE.md`  

**Never (unless human explicitly asks)**

- Migrate framework (Nuxt ↔ Next, Medusa ↔ Nest/Laravel)  
- Rename project structure  
- Change package manager (runtime is **npm**)  
- Update dependency majors  
- Add Redis “because old docs say so” (intentionally omitted in compose)  

---

## Short prompts this KB enables

| Prompt | Start in |
|--------|----------|
| Fix responsive homepage | `SMART_CONTEXT` → Responsive + `pages/index.vue` + `components/home/` |
| Add Blog page | `tin-tuc` + `useBlog` + campaign module |
| Refactor Header | `components/layout/AppHeader.vue` |
| Improve SEO | `nuxt.config.ts` + SEO composables + `server/routes/sitemap.xml.ts` |

---

## Quick commands

```bash
./start.dev.sh      # Docker: Nuxt + Medusa behind nginx
./build-local.sh    # medusa build + nuxt build
./start.prod.sh     # local prod stack from artifacts
./deploy.sh [host]  # ship artifacts to server
```

Default admin (seeded): `admin@medusa.local` / `supersecret123`.
