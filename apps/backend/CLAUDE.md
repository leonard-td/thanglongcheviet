# Medusa Admin extensions — table row-actions rule

Every data table (or table-like row list) in a custom admin page keeps its
per-row action controls in the **last column**, never mixed between data
columns:

- Header key: `<namespace>.columns.actions` (vi: "Thao tác", en: "Actions"),
  added to both `src/admin/i18n/json/vi.json` and `en.json`.
- **Exactly one action** → render it inline in that column (e.g. a `Copy` or
  an `IconButton`).
- **Two or more actions** → collapse them into a `DropdownMenu` triggered by
  an `IconButton` with the `EllipsisHorizontal` icon (see the folder tiles in
  `src/admin/routes/media/page.tsx` for the reference pattern; destructive
  items get `className="text-ui-fg-error"`).
- Tables use `onRowClick` to navigate, so the actions cell must wrap its
  content in a container with `onClick={(e) => e.stopPropagation()}`
  (see `src/admin/routes/campaign-topics/page.tsx`).

This applies to every existing table and to **all new admin pages** — do not
add per-row buttons anywhere except the trailing actions column.

# Medusa Admin extensions — i18n rule

The admin dashboard's language switcher (`src/admin/components/language-switcher`)
lets a user flip the whole UI between Vietnamese and English (and any other
Medusa-supported locale). **Every custom admin extension must respect that —
never hardcode a user-facing string.**

## Sidebar menu labels (`defineRouteConfig`)

`label` in `defineRouteConfig` is treated as a **literal string** unless
`translationNs` is also set — in which case it's resolved as an i18next key
via `t(label, { ns: translationNs })`. Our extension translations
(`src/admin/i18n/json/vi.json` + `en.json`) are merged by
`src/admin/i18n/index.ts` into i18next's default `translation` namespace, so
every custom route's sidebar entry must look like this:

```ts
export const config = defineRouteConfig({
  label: "menu.<key>",       // add "<key>" under "menu" in BOTH vi.json and en.json
  translationNs: "translation",
  icon: SomeIcon,
})
```

Adding a new custom route (a new entry under `src/admin/routes/`) means
adding a matching `menu.<key>` entry to **both**
`src/admin/i18n/json/vi.json` and `src/admin/i18n/json/en.json` — not just
one. Forgetting the Vietnamese (or English) side silently falls back to the
raw key/English string for the other language.

## Everything else inside a route/component

Same rule, no exception: buttons, table columns, toasts, modals, hints —
route through `useTranslation()` + a key in both `vi.json`/`en.json` (see the
existing `campaign-posts`, `campaign-topics`, `cards`, `mediaLib` namespaces
for the pattern). Never inline an English or Vietnamese string directly in a
`.tsx` file.

# Product admin extensions

Two widgets extend the core product detail page (both use `HttpTypes.AdminProduct`
as `data`, both translate through the `productDescription`/`productDuplicate`
i18n namespaces per the rule above):

- `src/admin/widgets/product-description.tsx` (zone `product.details.after`) —
  rich-text (TipTap) editor that saves HTML straight into the core
  `product.description` field via `sdk.admin.product.update(id, { description })`.
  Medusa's built-in Description textarea still renders above it (core form
  fields can't be removed by a widget) — this widget is the one to use for
  actually-formatted content; the storefront already renders `description`
  with `v-html`, so no Nuxt-side change is needed when editing it.
- `src/admin/widgets/product-duplicate.tsx` (zone `product.details.side.after`)
  — calls the custom `POST /admin/products/:id/duplicate` route
  (`src/api/admin/products/[id]/duplicate/route.ts`), then navigates to the
  new product. That route clones every field pulled via `query.graph`
  (options, variants, prices, images, categories/tags, sales channels,
  shipping profile) but:
  - always creates the copy as `status: "draft"`;
  - regenerates `handle` as `<original>-copy`, `-copy-2`, `-copy-3`, … since
    handle is unique — check `generateUniqueHandle` before changing the
    suffix scheme;
  - deliberately drops SKU/barcode-type fields so the copy doesn't collide on
    those unique constraints; the user re-enters them on the new product.

Storefront category/collection data these widgets don't touch: linking a
product category to a curated collection banner is done by admins setting
`metadata.related_collection_id` on the **category** (read by the storefront's
`useProducts().relatedCollectionIdByCategory`) — there's no dedicated UI field
for it yet, it's a raw metadata key.

# IN PROGRESS — Excel product import script (`src/scripts/import-products-excel.ts`)

CLI-only, not wired to any admin UI. Run manually inside the backend
container: `npm run import:products-excel -- ./path/to/file.xlsx` (script
reads `args[0]` via Medusa's `ExecArgs`, so the path must come through after
`--`). Matches spreadsheet rows to existing catalog items by **variant SKU**
(`COLUMNS.sku`) and updates product title/description/status + variant VND
price; rows with no SKU or an unmatched SKU are skipped and reported, never
created as new products.

**Blocked on:** the real Excel export from the client hasn't arrived yet.
`COLUMNS` at the top of the file (`SKU`, `Tên sản phẩm`, `Mô tả`, `Giá (VND)`,
`Trạng thái`) are placeholder header names guessed from the seed data shape —
**do not assume they're correct**. Once a real sample file shows up, diff its
actual headers against `COLUMNS` before running the script against it for
real.

**Known gaps to revisit when picking this back up:**
- Update-only — never creates a product for an unmatched SKU. Confirm with
  the client whether new-product creation from the sheet is actually needed;
  if so this script needs a create path, not just skip-and-report.
- `parsePrice()` strips all non-digit characters and assumes a single
  integer VND amount — no decimals, no multi-currency support.
- No dry-run/preview mode: the first real run against a client file will
  mutate live product data directly. Consider adding a `--dry-run` flag (log
  the diff instead of calling the update workflows) before running it against
  anything client-provided.
- No admin-dashboard trigger (upload button) exists — confirm whether the
  client needs to run this themselves (would need a real UI + file upload
  route) or whether CLI-only, dev-run-on-request is acceptable long-term.

# FIXED — Backup restore failing with "FILE_ENDED" (`src/lib/backup/`)

**Symptom reported:** creating a backup (Settings > Backup) produced a zip
that looked fine in the list, but restoring from that same zip failed with
`FILE_ENDED` (thrown by the `unzipper` lib while parsing the archive).

**Root cause — confirmed by direct testing, not guessed:** `createBackup()`
in `src/lib/backup/create.ts` used to open its `fs.createWriteStream()`
**directly at the final path** (`BACKUP_DIR/<name>.zip`) at the *start* of
the zip step, then streamed table CSVs + static media into it for tens of
seconds before closing. `GET /admin/backup` (`src/api/admin/backup/route.ts`)
lists **every** `.zip` file it finds via a plain `fs.readdir(BACKUP_DIR)` —
it has no idea a backup job is still writing to one of them. The admin UI
polls that endpoint every 1.5s while a job is `running`
(`settings/backup/page.tsx`'s `refetchInterval`), so the in-progress file
shows up in the table, complete with a working Download button, **before
archiver has finished writing it**. Downloading (or restoring) it at that
moment yields a truncated zip — no central directory yet — which is exactly
what makes `unzipper`/any zip reader throw `FILE_ENDED`. Verified end-to-end
by triggering a backup and polling `GET /admin/backup` during the `zip` step:
before the fix the new filename appeared in the list mid-write; after the
fix it only appears once the job reports `completed`. Backup creation and
restore (both from an existing server file and via re-upload) were confirmed
correct in isolation first — the bug was specifically the premature
visibility window, not the archiver/unzipper logic itself.

**Fix applied:** `create.ts` now writes the zip to a temp path *inside the
per-job staging directory* (`TMP_DIR` = `BACKUP_DIR/.tmp/<name>/`, already
excluded from `GET /admin/backup`'s non-recursive `.zip` scan) and only
`fsp.rename()`s it into `BACKUP_DIR/<name>.zip` as the very last step, after
`archive.finalize()` + the write stream's `close` event both resolve. Rename
is same-volume (staging and `BACKUP_DIR` share the same mount) so it's an
atomic, instant filesystem op — the file goes from "doesn't exist in
`BACKUP_DIR`" to "fully present" with no visible partial state in between.

**General lesson — applies beyond backups:** anywhere a long-running job
writes an artifact that a *separate* list/status endpoint exposes by
scanning a directory, **never give the in-progress file its final
list-visible name/location**. Write to a temp/staging path the lister
doesn't scan, then atomically move it into place only after the write is
fully flushed and closed. A "finish, then rename into place" pattern is the
fix, not "check file size didn't change" or other polling-based workarounds.
Revisit this same class of bug if a similar directory-scanning list endpoint
is ever added elsewhere (e.g. the media library, or the products-excel
import CLI if it ever grows a progress/output file).

# DONE — Navigation item thumbnails (`src/modules/navigation/`, `src/api/utils/nav-thumbnails.ts`)

**Current task:** Admin nav rows (`/app/navigation` → `SortableNavRow`) show
a thumbnail next to each item, resolved from whatever the item's `url`
actually points to — product, product_category, product_collection,
campaign_post, event, or a campaign_topic — plus a badge naming the matched
type. `navigation_item.thumbnail` is a manual override column; when empty,
both admin and storefront fall back to the auto-resolved image.

Resolution is **one shared function**, `attachNavThumbnails()` in
`src/api/utils/nav-thumbnails.ts`, built on `parseNavUrl()` in
`src/modules/navigation/nav-link-resolver.ts` — which mirrors the exact same
path prefixes already used by `apps/web/server/routes/sitemap.xml.ts` and the
`basePath` convention in `src/admin/widgets/{category,collection,product}-list-links.tsx`
(`/san-pham/:handle`, `/san-pham/danh-muc/:handle`, `/san-pham/bo-suu-tap/:handle`,
`/san-pham/chu-de/:slug`, `/tin-tuc/:slug`, `/tin-tuc/chu-de/:slug`,
`/trai-nghiem/:slug`, `/trai-nghiem/chu-de/:slug`). **Both**
`GET /admin/navigations*` and `GET /store/navigations` call this same
function — never resolve a nav URL's thumbnail (or any other "stored URL →
live entity" mapping) independently in a second place, or the admin preview
and the storefront's actual menu (`apps/web/components/layout/AppHeader.vue`
via `composables/useNavigation.ts`) can silently drift apart on what a URL
means. General rule going forward for this kind of feature: resolve
dynamically, once, server-side, in a place every consumer shares, and let the
value flow app (Medusa) → client (storefront) — don't re-implement the
mapping in the Vue layer.

**Known issues / things to check before touching this again:**
- This repo's dev stack runs entirely in Docker (`infra/docker-compose.yml`)
  and Postgres is **not** exposed to the host (`ports:` is commented out on
  the `postgres` service) — `npx medusa db:migrate` from a bare host shell
  fails with `ECONNREFUSED` even though the app is reachable at
  `localhost:8800`. The `tlcv_backend` container already runs `db:migrate` on
  every startup before `medusa develop`, so a container restart applies
  pending migrations on its own; to apply one immediately without restarting,
  run it inside the container instead — on this machine that's
  `wsl docker exec tlcv_backend npx medusa db:migrate` (Docker Desktop's
  WSL2 backend means `docker` isn't on PATH in a bare Windows/Git-Bash shell,
  but `wsl docker ...` reaches it). Forgetting this step shows up in the
  admin UI as `column "thumbnail" of relation "navigation_item" does not
  exist` on save.
- `product_category`/`product_collection` have no native thumbnail field —
  the resolver falls back to `metadata.thumbnail` (same convention as
  `category-media.tsx`/`collection-media.tsx`), then the first product's
  thumbnail. A category/collection nav link only gets an auto thumbnail once
  one of those exists.
- No live preview while creating a brand-new item: `resolved_thumbnail` only
  exists on items the backend has already returned once, so the picker in
  `routes/navigation/components/item-drawer.tsx` shows nothing for a new,
  unsaved item until it's saved and the tree refetches.

# DONE — Navigation item icon / leading-visual choice (`icon` + `display_mode`)

`navigation_item` also has `icon` (nullable text, a key from the fixed set in
`routes/navigation/nav-icons.tsx`) and `display_mode` (`"none" | "icon" |
"image"`, default `"none"`). In `item-drawer.tsx`, admins pick what renders
before an item's label on the storefront's **main navigation bar** (the
top-level `TRANG CHỦ / SẢN PHẨM / …` row, `apps/web/components/layout/
AppHeader.vue`) — nothing, one of the fixed icons, or the item's `thumbnail`
image (the field the thumbnail-resolution feature above already manages).
Both fields flow through the same shared path as `thumbnail` — create/update
routes accept them, `GET /store/navigations` returns them as-is (no separate
resolution needed, unlike thumbnail), and the storefront reads them straight
off `NavLink.icon`/`NavLink.displayMode` — same "resolve once, flow
app→client" rule noted above.

**The icon set is duplicated by necessity, keep both in sync:** admin and
storefront are separate apps (React admin vs. Vue storefront) with no shared
package, so the same icon keys + SVG paths exist twice (14 as of writing,
see `NAV_ICON_KEYS` for the current list) — `NAV_ICON_KEYS`/
`NavIconPreview` in `routes/navigation/nav-icons.tsx` (admin picker + row
badge) and the `AppIconName` union + template branches in
`apps/web/components/widgets/Icon.vue` (storefront + admin **must** use
identical keys, e.g. `"map-pin"`, `"newspaper"`). Adding a 13th icon means
editing both files with matching key + path, or the admin picker will offer
an option the storefront silently renders as an empty `<svg>`.

- `display_mode` is a DB-level enum/check constraint (`'none' | 'icon' |
  'image'`), not just a TS union — see `Migration20260813000000.ts`. Needs
  the same container-restart-or-manual-`db:migrate` step as the thumbnail
  migration above.
- Only the top-level nav row renders the icon/image today (`AppHeader.vue`'s
  desktop `.site-nav-link` and mobile `.site-mobile-link`) — dropdown/mega
  menu children still only ever show `thumbnail` (unconditional), since that
  was the only ask. The DB columns exist on every row (same table), so a
  child item can have `display_mode`/`icon` set in admin with no visible
  effect on the storefront yet if this is extended to children later.
