import {
  assertExportableTables,
  expandTablesForReplace,
  filterImportableTables,
  getSkippedBlockedTables,
  isForceExcluded,
  isImportBlocked,
  sortTablesForImport,
  sortTablesForReplaceTruncate,
} from "../table-registry"

describe("content-export table-registry", () => {
  it("force-excludes accounts, keys, customers, orders", () => {
    for (const table of [
      "user",
      "customer",
      "customer_address",
      "api_key",
      "order",
      "order_line_item",
      "cart",
      "payment",
      "care_message",
    ]) {
      expect(isForceExcluded(table)).toBe(true)
      expect(isImportBlocked(table)).toBe(true)
    }
  })

  it("allows content tables", () => {
    for (const table of ["card", "site_setting", "campaign_post", "product"]) {
      expect(isForceExcluded(table)).toBe(false)
      expect(isImportBlocked(table)).toBe(false)
    }
  })

  it("assertExportableTables rejects protected names", () => {
    expect(() => assertExportableTables(["card", "customer"])).toThrow(
      /Cannot export protected tables/
    )
  })

  it("filterImportableTables strips blocked tables", () => {
    expect(
      filterImportableTables(["card", "site_setting", "customer", "user"])
    ).toEqual(["card", "site_setting"])
  })

  it("sorts parents before children for import", () => {
    const order = sortTablesForImport([
      "card",
      "campaign_post",
      "campaign_topic",
      "site_setting",
    ])
    expect(order.indexOf("campaign_topic")).toBeLessThan(
      order.indexOf("campaign_post")
    )
    expect(order.indexOf("site_setting")).toBeLessThan(order.indexOf("card"))
  })

  it("sorts replace truncate in reverse import order", () => {
    const truncate = sortTablesForReplaceTruncate([
      "card",
      "campaign_post",
      "campaign_topic",
    ])
    expect(truncate[0]).toBe("campaign_post")
    expect(truncate[truncate.length - 1]).toBe("card")
  })

  it("getSkippedBlockedTables lists blocked names from selection", () => {
    expect(
      getSkippedBlockedTables(["card", "customer", "order"])
    ).toEqual(["customer", "order"])
  })

  it("expandTablesForReplace adds catalog siblings when product selected", () => {
    const available = new Set([
      "product",
      "product_variant",
      "product_category",
      "site_setting",
    ])
    const { expanded, added } = expandTablesForReplace(["product"], available)
    expect(expanded).toContain("product_variant")
    expect(expanded).toContain("product_category")
    expect(added).toContain("product_variant")
    expect(expanded).not.toContain("site_setting")
  })
})
