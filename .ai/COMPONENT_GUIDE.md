# COMPONENT_GUIDE.md

Nuxt auto-prefixes: `layout/AppHeader` → `<LayoutAppHeader />`, `sections/HeroSlider` → `<SectionsHeroSlider />`, etc.

## Folders

| Folder | Examples |
|--------|----------|
| `layout/` | AppHeader, AppFooter, SiteLogo, PageHero |
| `home/` | HomePageBackground, HomePillarList, HomeNewsMarquee (full-bleed ticker), HomeNewsTicker (featured + upward scroll), HomeMobileTopBanner |
| `sections/` | HeroSlider, Services*, Team*, Blog*, Product*, Contact*, GalleryFilter, … |
| `widgets/` | ConnectWidget, LangSwitch, CartToast, AutoScrollSidebar (article/about/product group — not homepage) |
| `product/` | CardActions |

Home (`pages/index.vue`) uses `layout: false` + `HomeNewsMarquee` + pillars + `HomeNewsTicker`.

Pillar card hover (`.preview-link`): transparent 2px border → red border on hover; **no box-shadow**.

## Admin

`apps/backend/src/admin/routes/**` + `CLAUDE.md` (actions column + i18n both locales).  
Product description TipTap widget: `widgets/product-description.tsx` (zone `product.details.after`, HTML into `product.description`).
