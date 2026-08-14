# Storefront data-fetching — two different reliability contracts

Every feature composable in `composables/` calls the Medusa Store API through
`useMedusaApi().fetchMedusa()` (adds the `x-publishable-api-key` header + the
logged-in customer's JWT). What happens when that call fails or a field is
simply missing on the backend **differs by composable** — check which
contract applies before assuming a field is "live from admin":

- **Real Medusa entities — no local fallback.** `useProducts.ts`
  (products/categories/collections), cart, orders, customers: these hit
  `/store/products`, `/store/product-categories`, `/store/collections`
  directly and are fully admin-managed already (created/edited in the Medusa
  admin, not a settings blob). `content/products.json` exists in the repo but
  is **dead code** — nothing imports it — don't assume editing it does
  anything.
- **Settings/content composed from a single-row admin form — local JSON
  fallback, field-by-field merge.** `useSiteBundle.ts` (site-wide settings:
  contact info, hours, social links, hero images) and `useBlog.ts`
  (`campaign-posts`/`campaign-topics`) fall back to `content/settings.json` /
  `content/blog.json` when the API errors *and* `useSiteBundle` always starts
  from that local fallback object and overlays only the specific remote
  fields it explicitly lists (see the `settings.contact = { ...fallback,
  address: remote.address || fallback.address, ... }` shape). **Any field the
  merge doesn't explicitly mention stays hardcoded to the fallback forever,
  even though it renders next to other fields that *are* admin-driven** — this
  silently bit the footer's "Hotline" line (`contact.mobile`), which had no
  matching admin field at all and always showed the seed value. When adding a
  new admin-editable field anywhere that reads from `useSiteBundle`/
  `useSettings`, add it to that merge block or it won't actually be live.

# Products domain

- `composables/useProducts.ts` is the single data-access point for the
  storefront catalog: `products`, `categories`, `collections`, `getBySlug`,
  `related`, `byCategory`, `byCollection`. `PRODUCT_FIELDS` in that file is
  the one place the Store API field selection lives — extend it there rather
  than re-querying with a different field list elsewhere.
- No real "featured" flag exists in Medusa yet — `featuredProducts` is just
  `products.slice(0, 6)`. Wire up a real flag (e.g. `metadata.featured`)
  before relying on this for anything curated.
- A category's banner/related collection is set by admins as
  `metadata.related_collection_id` on the **product category** (see
  `apps/backend` CLAUDE.md's Product admin extensions section) — read here via
  `relatedCollectionIdByCategory`.
- The header's product mega-menu (`AppHeaderProductsMenu.vue`) groups tiles
  of each category's **actual products** (`byCategory(cat.id)`, from
  `useProducts()`), not one tile per category — a category with 5 products
  shows 5 tiles under its section, a category with 0 shows nothing (the
  whole section is filtered out). Section bucketing is still purely
  category-metadata driven — `metadata.menu_group` (bucket key, empty =
  default "Chè" bucket, title from `nav.productsMenu.teaGroup`),
  `metadata.menu_group_label` (bucket title override; falls back to the
  category's own name if unset). No group name/count is hardcoded in the
  component — adding or renaming a group, or adding more chè/cà phê/quà tặng
  products, is purely a Medusa-admin/data change. **`metadata.menu_hidden` is
  not consulted here** — it predates this products-per-section design (back
  when a category was rendered as a single tile, `menu_hidden` kept
  coffee/gift out of that flat grid and routed them to a curated landing page
  via a nav child instead); with real products as the tiles now, an
  empty/zero-product category already stays invisible on its own, so the flag
  has no remaining effect on this component. `sync-menu-categories.ts` still
  writes `menu_hidden: true` when creating those categories — harmless here,
  but don't rely on it to hide a category from this menu; the only lever now
  is whether it has products. The `quickLinks` section (labelled via
  `nav.productsMenu.moreTitle`) is separate and still nav-driven: it lists
  whatever children Admin > Điều hướng has under "Sản phẩm" (curated
  destinations like `/qua-tang-doanh-nghiep`, `/an-quang-caffe`, or the full
  `/san-pham-list` catalog) — see `apps/backend` CLAUDE.md's "Navigation item
  thumbnails" entry for how those get their thumbnail.
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
(`LayoutAppHeaderProductsMenu`, `LayoutAppHeaderNewsMenu`) still fetch their
own images independently via `useProducts`/`useBlog` for the
`isProductsLink`/`isNewsLink` special cases — that's pre-existing and
untouched; the shared `thumbnail` field only feeds the generic dropdown/
mobile-menu path today.

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
(`components/widgets/Icon.vue`) — the `AppIconName` union there was extended
with a nav icon set (`home`, `leaf`, `tea`, `coffee`, `gift`, `calendar`,
`newspaper`, `book`, `users`, `phone`, `map-pin`, `star`, `tag`, `info`) that
**must** stay byte-for-byte in sync with `NAV_ICON_KEYS`/`NavIconPreview` in
the backend's
`src/admin/routes/navigation/nav-icons.tsx` (separate React/Vue apps, no
shared package — see that repo's CLAUDE.md). Only top-level items render
this; dropdown/mega-menu children keep the unconditional `thumbnail`-only
behavior they already had.
