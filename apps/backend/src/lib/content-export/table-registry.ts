export type TableGroup =
  | "config"
  | "menu"
  | "cards"
  | "content"
  | "catalog"
  | "media"
  | "events"
  | "operations"
  | "other"

export type TableMeta = {
  name: string
  group: TableGroup
  label: string
  default_selected: boolean
  excluded: boolean
  import_blocked: boolean
  default_merge: boolean
  import_order: number
}

const GROUP_LABELS: Record<TableGroup, string> = {
  config: "Cấu hình",
  menu: "Menu",
  cards: "Card trang chủ",
  content: "Bài viết",
  catalog: "Sản phẩm",
  media: "Thư viện ảnh",
  events: "Sự kiện",
  operations: "Vận hành",
  other: "Khác",
}

/** Never export/import — accounts, keys, orders, customers, RBAC, system. */
const FORCE_EXCLUDED_EXACT = new Set([
  "user",
  "invite",
  "auth_identity",
  "provider_identity",
  "api_key",
  "publishable_api_key",
  "secret_api_key",
  "customer",
  "customer_address",
  "customer_group",
  "customer_group_customer",
  "cart",
  "cart_address",
  "cart_line_item",
  "cart_payment_collection",
  "cart_shipping_method",
  "cart_line_item_adjustment",
  "cart_line_item_tax_line",
  "cart_shipping_method_adjustment",
  "cart_shipping_method_tax_line",
  "order",
  "order_address",
  "order_cart",
  "order_change",
  "order_change_action",
  "order_claim",
  "order_claim_item",
  "order_claim_item_image",
  "order_credit_line",
  "order_exchange",
  "order_exchange_item",
  "order_fulfillment",
  "order_item",
  "order_line_item",
  "order_line_item_adjustment",
  "order_line_item_tax_line",
  "order_shipping",
  "order_shipping_method",
  "order_shipping_method_adjustment",
  "order_shipping_method_tax_line",
  "order_summary",
  "order_transaction",
  "payment",
  "payment_collection",
  "payment_collection_payment_providers",
  "payment_provider",
  "payment_session",
  "mikro_orm_migrations",
  "policy",
  "care_message",
])

const FORCE_EXCLUDED_PATTERNS = [
  /^order_/,
  /^cart_/,
  /^payment_/,
  /^customer_/,
  /^rbac_/,
  /^auth_/,
  /^link_/,
  /^return_/,
  /^refund_/,
  /^capture_/,
  /^account_holder/,
  /^credit_line/,
  /^promotion_/,
  /^application_method/,
]

/** Always skipped on import even if present in an uploaded file. */
const IMPORT_BLOCKED_EXACT = new Set([
  ...FORCE_EXCLUDED_EXACT,
])

const KNOWN: Record<
  string,
  Omit<TableMeta, "name" | "excluded" | "import_blocked">
> = {
  site_setting: {
    group: "config",
    label: "Thông tin cửa hàng",
    default_selected: true,
    default_merge: false,
    import_order: 10,
  },
  navigation_menu: {
    group: "menu",
    label: "Menu (header)",
    default_selected: true,
    default_merge: false,
    import_order: 20,
  },
  navigation_item: {
    group: "menu",
    label: "Mục menu",
    default_selected: true,
    default_merge: false,
    import_order: 30,
  },
  card: {
    group: "cards",
    label: "Card trang chủ",
    default_selected: true,
    default_merge: false,
    import_order: 40,
  },
  campaign_topic: {
    group: "content",
    label: "Chủ đề bài viết",
    default_selected: true,
    default_merge: true,
    import_order: 50,
  },
  campaign_post: {
    group: "content",
    label: "Bài viết Campaign",
    default_selected: true,
    default_merge: true,
    import_order: 60,
  },
  media_folder: {
    group: "media",
    label: "Thư mục media",
    default_selected: true,
    default_merge: false,
    import_order: 70,
  },
  card_media: {
    group: "media",
    label: "File media",
    default_selected: true,
    default_merge: false,
    import_order: 80,
  },
  event: {
    group: "events",
    label: "Sự kiện",
    default_selected: false,
    default_merge: false,
    import_order: 90,
  },
  event_registration: {
    group: "operations",
    label: "Đăng ký sự kiện",
    default_selected: false,
    default_merge: true,
    import_order: 100,
  },
  inquiry: {
    group: "operations",
    label: "Liên hệ / Đặt lịch",
    default_selected: false,
    default_merge: true,
    import_order: 110,
  },
  care_channel: {
    group: "operations",
    label: "Kênh CSKH",
    default_selected: false,
    default_merge: false,
    import_order: 120,
  },
  product: {
    group: "catalog",
    label: "Sản phẩm",
    default_selected: true,
    default_merge: true,
    import_order: 200,
  },
  product_variant: {
    group: "catalog",
    label: "Biến thể sản phẩm",
    default_selected: true,
    default_merge: true,
    import_order: 210,
  },
  product_option: {
    group: "catalog",
    label: "Tùy chọn sản phẩm",
    default_selected: true,
    default_merge: true,
    import_order: 205,
  },
  product_option_value: {
    group: "catalog",
    label: "Giá trị tùy chọn",
    default_selected: true,
    default_merge: true,
    import_order: 206,
  },
  product_category: {
    group: "catalog",
    label: "Danh mục sản phẩm",
    default_selected: true,
    default_merge: true,
    import_order: 195,
  },
  product_category_product: {
    group: "catalog",
    label: "Liên kết danh mục ↔ sản phẩm",
    default_selected: true,
    default_merge: true,
    import_order: 215,
  },
  product_collection: {
    group: "catalog",
    label: "Bộ sưu tập",
    default_selected: true,
    default_merge: true,
    import_order: 196,
  },
  product_tag: {
    group: "catalog",
    label: "Tag sản phẩm",
    default_selected: true,
    default_merge: true,
    import_order: 197,
  },
  product_tags: {
    group: "catalog",
    label: "Liên kết tag ↔ sản phẩm",
    default_selected: true,
    default_merge: true,
    import_order: 216,
  },
  product_type: {
    group: "catalog",
    label: "Loại sản phẩm",
    default_selected: true,
    default_merge: true,
    import_order: 198,
  },
  image: {
    group: "catalog",
    label: "Ảnh sản phẩm",
    default_selected: true,
    default_merge: true,
    import_order: 220,
  },
  price: {
    group: "catalog",
    label: "Giá",
    default_selected: true,
    default_merge: true,
    import_order: 230,
  },
  price_set: {
    group: "catalog",
    label: "Bộ giá",
    default_selected: true,
    default_merge: true,
    import_order: 225,
  },
  inventory_item: {
    group: "catalog",
    label: "Tồn kho (item)",
    default_selected: true,
    default_merge: true,
    import_order: 240,
  },
  inventory_level: {
    group: "catalog",
    label: "Tồn kho (level)",
    default_selected: true,
    default_merge: true,
    import_order: 250,
  },
}

const CATALOG_PREFIXES = ["product_", "price", "inventory_", "image"]

export function isForceExcluded(table: string): boolean {
  if (FORCE_EXCLUDED_EXACT.has(table)) return true
  return FORCE_EXCLUDED_PATTERNS.some((re) => re.test(table))
}

export function isImportBlocked(table: string): boolean {
  if (IMPORT_BLOCKED_EXACT.has(table)) return true
  return FORCE_EXCLUDED_PATTERNS.some((re) => re.test(table))
}

function inferGroup(table: string): TableGroup {
  if (table.startsWith("product") || table.startsWith("price") || table.startsWith("inventory") || table === "image") {
    return "catalog"
  }
  return "other"
}

export function resolveTableMeta(name: string): TableMeta {
  const excluded = isForceExcluded(name)
  const import_blocked = isImportBlocked(name)
  const known = KNOWN[name]

  if (known) {
    return {
      name,
      excluded,
      import_blocked,
      ...known,
    }
  }

  const group = inferGroup(name)
  const catalogDefault =
    group === "catalog" ||
    CATALOG_PREFIXES.some((p) => name.startsWith(p))

  return {
    name,
    group,
    label: name,
    default_selected: catalogDefault && !excluded,
    default_merge: group === "catalog" || group === "content",
    import_order: catalogDefault ? 300 : 900,
    excluded,
    import_blocked,
  }
}

export function getGroupLabel(group: TableGroup): string {
  return GROUP_LABELS[group]
}

export function assertExportableTables(tables: string[]): void {
  const blocked = tables.filter(isForceExcluded)
  if (blocked.length) {
    throw new Error(
      `Cannot export protected tables: ${blocked.join(", ")}`
    )
  }
}

export function filterImportableTables(tables: string[]): string[] {
  return tables.filter((t) => !isImportBlocked(t))
}

export function sortTablesForImport(tables: string[]): string[] {
  return [...tables].sort((a, b) => {
    const oa = resolveTableMeta(a).import_order
    const ob = resolveTableMeta(b).import_order
    if (oa !== ob) return oa - ob
    return a.localeCompare(b)
  })
}

export function sortTablesForReplaceTruncate(tables: string[]): string[] {
  return sortTablesForImport(tables).reverse()
}

/** Tables whose JSON export includes file URLs but not binary static/ assets. */
export const MEDIA_METADATA_TABLES = new Set(["card_media", "image"])

/**
 * Replace mode must truncate/import whole dependency groups together — otherwise
 * orphaned FK rows survive (FK checks are disabled during import).
 */
export const REPLACE_GROUPS: Record<string, readonly string[]> = {
  catalog: [
    "product",
    "product_variant",
    "product_option",
    "product_option_value",
    "product_product_option",
    "product_product_option_value",
    "product_category",
    "product_category_product",
    "product_collection",
    "product_tag",
    "product_tags",
    "product_type",
    "product_sales_channel",
    "product_shipping_profile",
    "product_variant_inventory_item",
    "product_variant_option",
    "product_variant_price_set",
    "product_variant_product_image",
    "image",
    "price",
    "price_set",
    "inventory_item",
    "inventory_level",
  ],
  content: ["campaign_topic", "campaign_post"],
  menu: ["navigation_menu", "navigation_item"],
  cards: ["card"],
  config: ["site_setting"],
  media: ["media_folder", "card_media"],
  events: ["event", "event_registration"],
  operations: ["inquiry", "care_channel"],
}

function replaceGroupForTable(table: string): string | null {
  for (const [group, members] of Object.entries(REPLACE_GROUPS)) {
    if (members.includes(table)) return group
  }
  return null
}

export function getSkippedBlockedTables(tables: string[]): string[] {
  return tables.filter(isImportBlocked)
}

export function expandTablesForReplace(
  tables: string[],
  available: ReadonlySet<string>
): { expanded: string[]; added: string[] } {
  const selected = new Set(tables)
  const added: string[] = []

  for (const table of tables) {
    const group = replaceGroupForTable(table)
    if (!group) continue
    for (const member of REPLACE_GROUPS[group]) {
      if (isForceExcluded(member) || !available.has(member)) continue
      if (!selected.has(member)) {
        selected.add(member)
        added.push(member)
      }
    }
  }

  return {
    expanded: sortTablesForImport([...selected]),
    added: sortTablesForImport(added),
  }
}

export function selectionIncludesMediaTables(tables: string[]): boolean {
  return tables.some((t) => MEDIA_METADATA_TABLES.has(t))
}
