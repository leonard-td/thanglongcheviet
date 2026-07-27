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
- Medusa core product form still shows a plain Description textarea beside the TipTap widget (`product.details.after`) — cannot hide core fields via widgets  

## Fixed (2026-07)

- **Detail reload false-404:** article/product `getBySlug` used to swallow transport errors → `null` → fatal 404 on SSR refresh. Now only true 404s map to not-found; other failures rethrow / surface via `useAsyncData` error.  
- **Homepage:** `HomeNewsMarquee` restored (full-width bar); `HomeNewsTicker` mounted with upward CSS loop; pillar `.preview-link` hover is red border only (no box-shadow / lift).  
- **Product rich description:** admin widget reuses TipTap (`output: 'html'`) → `product.description`.  

## Ops caveats

Admin HMR often disabled in Docker; CHOKIDAR polling on WSL; don’t run dev+prod on same ports; `COOKIE_SECURE=false` only for local HTTP.
