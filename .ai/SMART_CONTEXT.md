# SMART_CONTEXT.md

Short prompt → files. Start with `AI_START_HERE.md` + `PROJECT_MEMORY.md`.

| Ask | Look here |
|-----|-----------|
| Responsive / homepage | `pages/index.vue`, `components/home/*`, `layout/AppHeader`, `assets/css/*`, `tailwind.config.js`, `templates/RESPONSIVE.md` |
| New component | `components/{layout,home,sections,widgets,product}`, `COMPONENT_GUIDE.md` |
| SEO | `nuxt.config.ts`, `useSeo*`, `server/routes/sitemap.xml.ts`, `templates/SEO.md` |
| Docker | `infra/docker-compose.yml`, `docker-compose.prod.yml`, `nginx/conf.d/default.conf`, `start.dev.sh` |
| Content JSON | `apps/web/content/*` |
| i18n | `nuxt.config.ts` i18n, `locales/{vi,en}.json`, `LangSwitch.vue` |
| Images | `@nuxt/image`, `NuxtImg`, `/static`, `useMediaUrl` |
| Blog | `tin-tuc/**`, `useBlog`, `modules/campaign`, TipTap utils |
| Cart/products | `useMedusaApi`, `useProducts`, `useCart`, `san-pham*`, `gio-hang` |
| Product rich description (admin) | `apps/backend/src/admin/widgets/product-description.tsx` |
| Homepage news / marquee / cards | `pages/index.vue`, `HomeNewsMarquee`, `HomeNewsTicker`, `HomePillarList` |
| Header/nav | `AppHeader`, `useNavigation`, `modules/navigation` |
| Booking/contact | `useBooking`, `useContact`, `modules/inquiry` |
| Admin | `CLAUDE.md`, `src/admin/routes/**`, `/app` |
| Deploy | `build-local.sh`, `deploy.sh`, `.github/workflows/deploy.yml` |
| NestJS/theme editor | Docs only — do **not** implement |

Branch context: `dev/be_medusajs_merge`.
