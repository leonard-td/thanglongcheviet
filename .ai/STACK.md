# STACK.md

| Component | Technology | Note |
|-----------|------------|------|
| Node | ≥20 | Docker `node:20` |
| Package manager | npm | leftover pnpm files exist |
| FE | Nuxt 3.17, Vue 3, Tailwind 3, i18n 9, @nuxt/image | `apps/web` |
| BE | Medusa 2.17, TipTap, Zod, React 18 admin | `apps/backend` |
| DB | PostgreSQL 15 | compose |
| Edge | nginx 1.25-alpine | single HTTP port |
| Optional CMS | Strapi 5.50 | `strapi/` |
| Monorepo | npm workspaces + turbo | |

**Intentionally absent from compose:** Redis (boot hang history), NestJS, Prisma, MinIO.

Env: `.env.dev` / `.env.prod` / `.env.example`.
