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
