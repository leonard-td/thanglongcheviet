# COMPONENT_GUIDE.md

Nuxt auto-prefixes: `layout/AppHeader` → `<LayoutAppHeader />`, `sections/HeroSlider` → `<SectionsHeroSlider />`, etc.

## Folders

| Folder | Examples |
|--------|----------|
| `layout/` | AppHeader, AppFooter, SiteLogo, PageHero |
| `home/` | HomePageBackground, HomePillarList, HomeNewsMarquee, HomeMobileTopBanner |
| `sections/` | HeroSlider, Services*, Team*, Blog*, Product*, Contact*, GalleryFilter, … |
| `widgets/` | ConnectWidget, LangSwitch, CartToast |
| `product/` | CardActions |

Home (`pages/index.vue`) often uses `layout: false`.

## Composables

**Commerce:** `useMedusaApi`, `useProducts`, `useCart`, `useCustomerAuth`, `useOrder`, `usePayment`, `useQuickBuyBar`  
**Content:** `useBlog`, `useCards`, `useEvents`, `useNavigation`, `useSiteSettings`, `useSiteBundle`, `useServices`, `useTeam`, `useGallery`, `useBooking`, `useContact`, `useMediaUrl`  
**Cross:** `useAppI18n`, `useApi` (legacy), `useSeo*`, `useScrollAnimation`

## Utils

`medusa.ts`, `storefront.ts`, `tiptap.ts`

## Admin

`apps/backend/src/admin/routes/**` + `CLAUDE.md` (actions column + i18n both locales).

Stub alias: `COMPONENTS.md` → this file.
