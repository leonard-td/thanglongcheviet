# KNOWN_ISSUES.md

## Doc drift

Root README (Next/DTC), `docs/ARCHITECTURE|PLAN` (Nest salon), `srs.md` (Next+Strapi), old Cursor Nest rules — vs live **Nuxt+Medusa**.

## Config

- `.env.example` may contain merge conflict markers  
- npm + leftover pnpm files; missing `packages/`  
- Dual deploy stories (`deploy.sh` vs GH Action)

## App gaps

- Dual clients: `useMedusaApi` vs legacy `useApi` `/api/storefront`  
- Sitemap → `/api/storefront/sitemap` (soft-fail to static)  
- Featured products placeholder `slice(0, 6)`  
- Strapi unwired in main compose  
- Empty `design-copilot` / `ui-reference-tool` dirs  

## Ops caveats

Admin HMR often disabled in Docker; CHOKIDAR polling on WSL; don’t run dev+prod on same ports; `COOKIE_SECURE=false` only for local HTTP.
