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

# Ask Messages (storefront) vs care-messages (admin)

- **Ask** = consumer assistant: `src/modules/ask` + `POST /store/ask` (+
  `/store/ask/escalate`). **Rule-engine** path: QueryMapper →
  executeMappedPlan → in-process Medusa catalog search. Opt-in Cohere Rerank
  via `COHERE_RERANK=1` + `COHERE_API_KEY` (server-only; never Nuxt public).
- **care-messages** = admin human CSKH inbox for Telegram/Zalo. Do not merge
  these two concepts.
- No Typesense on this stack — lib keyword + filters/sort + optional Cohere.
- Full architecture + ops guide: `docs/ASK-MESSAGES.md`.
