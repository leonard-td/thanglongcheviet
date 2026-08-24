# Storefront data-fetching — backend is the only source of content

Every feature composable in `composables/` calls the Medusa Store API through
`useMedusaApi().fetchMedusa()` (adds the `x-publishable-api-key` header + the
logged-in customer's JWT). **There is no local fallback content anywhere** —
no `content/*.json` seed blobs, no bundled stock imagery. A failed or empty
API response yields empty state, which is intentional: a blank block signals
"the admin hasn't filled this in" instead of silently showing invented copy.

- Products/categories/collections, cart, orders, customers hit
  `/store/products`, `/store/product-categories`, `/store/collections`
  directly and are fully admin-managed.
- Site-wide settings (contact info, hours, social links, hero images, brand
  tagline/description) come from `useSiteSettings.ts` → `GET
  /store/site-settings?lang=`. `useSettings.ts` is a thin presentation layer
  over it (splits `open_hours` into rows, groups contact/social) and does
  **not** inject defaults. Adding an admin-editable field means: model column
  + migration + admin form + admin/store route (see `apps/backend`
  CLAUDE.md), then read it through `useSiteSettings`.
- Blog/events come from `campaign-posts`/`campaign-topics`; an unreachable or
  empty API renders the empty state.
- When a record has no image, use `PLACEHOLDER_IMAGE` from
  `utils/storefront.ts` (a neutral in-repo SVG). Never a stock photo — the
  placeholder must never read as real content.
- User-facing strings belong in `locales/{vi,en}.json`, never inline in a
  template. Anything that is *content* (not UI chrome) belongs in the backend.

# Products domain

- `composables/useProducts.ts` is the single data-access point for the
  storefront catalog: `products`, `categories`, `collections`, `getBySlug`,
  `related`, `byCategory`, `byCollection`. `PRODUCT_FIELDS` in that file is
  the one place the Store API field selection lives — extend it there rather
  than re-querying with a different field list elsewhere.
- Medusa has no native "featured" flag, so `featuredProducts` filters on
  `metadata.featured === true`, toggled per product by the
  `product-featured.tsx` admin widget. Nothing is featured until an admin says
  so — `HomePromotionsList` shows an empty state rather than backfilling with
  arbitrary products.
- A category's banner/related collection is set by admins as
  `metadata.related_collection_id` on the **product category** (see
  `apps/backend` CLAUDE.md's Product admin extensions section) — read here via
  `relatedCollectionIdByCategory`.
- The header's product mega-menu (`AppHeaderProductsMenu.vue`) is **purely
  nav-driven, not a product/category scan** — every tile comes straight from
  the "Sản phẩm" nav item's `children` in Admin > Điều hướng (no
  `useProducts()`/`byCategory()` call in this component at all; an earlier
  products-per-category design was replaced and this note used to describe
  that old version — don't trust a doc here without re-checking the file).
  Section bucketing falls out of each child's `linkType` (`product_category`
  -> "Duyệt theo danh mục", `product_collection` -> "Duyệt theo bộ sưu tập",
  anything else -> the `nav.productsMenu.moreTitle` catch-all), already
  resolved server-side by `nav-link-resolver.ts` from the item's `url` — see
  `apps/backend` CLAUDE.md's "Navigation item thumbnails". Admin doesn't pick
  a section manually; adding/reordering tiles is purely an Admin > Điều
  hướng change, not a Medusa product/category metadata change.
- Pages: `pages/san-pham-list.vue` (catalog, uses `ProductCatalog.vue`),
  `pages/san-pham/[slug].vue` (detail).
- `ProductCatalog.vue` renders **every** product permanently and toggles
  category filters with `v-show`, never by changing the `v-for` source array.
  `useScrollAnimation()` only observes elements present at mount — swapping
  the `v-for` array on filter change would create fresh `.animate-on-scroll`
  nodes that never get observed and stay stuck at `opacity: 0`.

# Checking "is the frontend clean" — use typecheck, not lint

`npm run lint` in this workspace is **broken and non-functional** — it
crashes immediately with `TypeError: Cannot set properties of undefined
(setting 'defaultMeta')` from ajv, before linting a single file. This is a
known config gap, not a code problem — don't burn tokens re-diagnosing the
crash trace from scratch. Root cause: the script is
`eslint . --ext .vue,.ts,.tsx` (ESLint 8 legacy-config CLI flag), but the
repo runs ESLint 9 with only a root flat config (`eslint.config.ts`) built on
`@medusajs/eslint-plugin` — a Node/backend config with no `.vue`/Vue-SFC
support. `apps/web` has no `eslint.config.*` of its own and no
`eslint-plugin-vue`/`@nuxt/eslint` in its devDependencies, so fixing just the
CLI flag would still not parse `.vue` files.

- **`npm run typecheck` (`nuxt typecheck`, vue-tsc under the hood) works
  correctly and is the real signal for "does this compile cleanly."** Use it
  when asked to verify the frontend is type-safe/clean.
- To actually fix lint (only do this if asked — it's a dependency/config
  change, not a one-line fix): add the `@nuxt/eslint` module to `modules` in
  `nuxt.config.ts` and let it generate a Vue/Nuxt-aware flat config, rather
  than patching the ajv error or the CLI flag in isolation.

# Nuxt auto-import: don't re-export types across auto-import dirs

Both `utils/` and `composables/` are auto-imported by Nuxt. A type defined in
`utils/storefront.ts` (`Product`, `BlogPost`, `BlogTopic`) that is *also*
re-exported from a composable (`export type { Product } from
'~/utils/storefront'` in `useProducts.ts`/`useBlog.ts`) gives Nuxt two
same-named auto-import sources and prints a `Duplicated imports "X" ... has
been ignored` warning on every dev/build/typecheck run. Nothing in this repo
imports these types via the composable path — only via Nuxt's auto-import of
`utils/` — so import the type locally inside the composable if you need it
there, but don't re-export it.

# DONE — Header nav thumbnails are backend-resolved, not fetched here

`AppHeader.vue`'s dropdowns (both the plain `site-dropdown-link`/
`site-mobile-sublink` fallback and, going forward, anything similar) render a
`thumbnail` per item straight from `composables/useNavigation.ts`'s
`NavLink.thumbnail`/`linkType`, which come from `GET /store/navigations`
as-is. **Don't add client-side logic here that maps a nav item's `url` to a
product/post/event to fetch its own image** — that mapping already lives
once, server-side, in `apps/backend/src/api/utils/nav-thumbnails.ts` (see
that repo's CLAUDE.md, "Navigation item thumbnails"), shared by both the
admin preview and this same `/store/navigations` response, specifically so
the admin's preview and what actually renders here can't drift apart. Only
`useMediaUrl().resolveMediaUrl()` runs on the client, in
`useNavigation.ts`'s `mapNavigationToNavLinks()`, to turn a relative
`/static/...` path from the backend into an absolute URL — same pattern as
`useBlog.ts`/`useEvents.ts`. The two mega-menu components
(`LayoutAppHeaderProductsMenu`, `LayoutAppHeaderNewsMenu`, see the "Header
mega menus" section below) still fetch their own images independently for
the `isProductsLink`/`isNewsLink` special cases — that's pre-existing and
untouched; the shared `thumbnail` field only feeds the generic dropdown/
mobile-menu path today.

# DONE — Header mega menus share one presentational shell (`AppHeaderMegaMenu.vue`)

`AppHeaderProductsMenu.vue` and `AppHeaderNewsMenu.vue` used to each carry
their own copy of the section/grid/thumb/label/footer/skeleton markup and
~150 lines of near-identical CSS (only the class-name prefix and a couple of
width values differed) — that duplication is now split out:

- **`AppHeaderMegaMenu.vue`** — the shared shell. Owns all layout/markup/CSS.
  Props: `sections: MegaMenuSection[]` (`{ key, title, items }`, item =
  `{ key, path, label, image, openInNewTab? }`), `loading`, `skeletonCount`,
  `viewAllPath`, `viewAllLabel`, `viewAllIcon`, `minWidth`, `maxWidth`. Calls
  `useLocalePath()` itself, so callers pass raw paths.
- **`AppHeaderProductsMenu.vue`** / **`AppHeaderNewsMenu.vue`** — data-only
  now: each computes its own `sections` (Products from nav `children` +
  `linkType`, as above; News from `useBlogTopics()` + `useCards()` merged
  into one section, plus a `pending` flag for the shared shell's skeleton)
  and renders `<AppHeaderMegaMenu :sections="..." ... />`. Neither has its
  own `<style>` block anymore.
- **`AppHeader.vue`** dispatches which mega menu (if any) renders for a nav
  item via `MEGA_MENU_VARIANTS` (`{ matches, component }[]`) +
  `megaMenuFor(link)`, rendered through `<component :is="megaMenuFor(link)">`
  — not a hardcoded `v-if isProductsLink / v-else-if isNewsLink` chain. A
  future third mega-menu type (e.g. a curated "Làng nghề"/craft-village nav
  item once Layer B IA lands) means: write its own small data-only component
  rendering `AppHeaderMegaMenu`, then add one `{ matches, component }` entry
  to `MEGA_MENU_VARIANTS` — no template edits, no new CSS.
- Dropped in this pass: `AppHeaderNewsMenu.vue` used to also call `useBlog()`
  for a `featuredPost` that no `<template>` block actually rendered (a
  `.news-mega-feature*` CSS block existed for it too) — dead code from an
  earlier design iteration, removed rather than carried into the shared
  shell.
- Mobile nav (`.site-mobile-submenu`) is untouched — it still always renders
  the flat `site-mobile-sublink` list regardless of nav item, never the mega
  menu.

# DONE — Main nav bar leading icon/image (`NavLink.icon`/`displayMode`)

Each top-level item in `AppHeader.vue`'s `<nav aria-label="Main navigation">`
(desktop `.site-nav-link`) and its mobile equivalent (`.site-mobile-link`)
can render a small icon or thumbnail image before the label, driven entirely
by Admin > Điều hướng — `link.displayMode` (`"none" | "icon" | "image"`) and
`link.icon` come straight off `GET /store/navigations` via
`useNavigation.ts`'s `mapNavigationToNavLinks()`, no client-side resolution
needed (unlike thumbnail, `icon`/`display_mode` aren't derived from `url`).
`displayMode: "image"` reuses the item's existing `thumbnail` field — there's
no second image field. Icons render via `<WidgetsIcon :name="link.icon" />`
(`components/widgets/Icon.vue`), which resolves `name` in three tiers,
checked in this order:

1. **Custom uploaded image** — `isImageUrl` (`name.includes('/')`) is true,
   `name` is actually a URL from the admin's "Hoặc dùng ảnh riêng" image
   picker, not an icon key at all. No separate field for this — the same
   `icon` text column holds either a key or a URL. Renders a plain `<img>`.
2. **Legacy hand-drawn set** (`LEGACY_ICON_NAMES` — `home`, `leaf`, `tea`,
   `coffee`, `gift`, `calendar`, `newspaper`, `book`, `users`, `star`, `tag`,
   `info`, plus `map-pin`/`phone`/`mail`/`globe`) that **must** stay in sync
   with `NAV_ICON_KEYS`/`NavIconPreview` in the backend's
   `src/admin/routes/navigation/nav-icons.tsx` (separate React/Vue apps, no
   shared package — see that repo's CLAUDE.md).
3. **Everything else** — resolved dynamically at runtime from `@lucide/vue`
   by PascalCase name (`"map-pin"` -> `MapPin`) via `defineAsyncComponent`
   — no hand-sync needed for this tier, picking a new Lucide icon name in
   the admin (`item-drawer.tsx`'s search field) just works here with zero
   code changes. **Not `lucide-vue-next`** — that package is deprecated
   (still installable but frozen at its last release); the Lucide project
   moved Vue support to the `@lucide/vue` scoped package, same icon set/API,
   just renamed. If `npm install` for `apps/web` ever fails resolving a
   `lucide-vue-next` version, that's this rename, not a typo'd version.

Keep `@lucide/vue`'s major version aligned with the backend's `lucide-react`,
and keep the `isImageUrl` check identical to the backend's
`isIconImageUrl()` in `nav-icons.tsx`. Only top-level items render this;
dropdown/mega-menu children keep the unconditional `thumbnail`-only behavior
they already had.
