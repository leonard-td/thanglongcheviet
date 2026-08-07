import { updateProductsWorkflow, updateProductVariantsWorkflow } from "@medusajs/medusa/core-flows"
import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import * as XLSX from "xlsx"

/**
 * Header names in the source spreadsheet. Adjust these to match the real
 * export once it's available — everything else in the script keys off this
 * map, so a renamed column only needs a change here.
 */
const COLUMNS = {
  sku: "SKU",
  title: "Tên sản phẩm",
  description: "Mô tả",
  price: "Giá (VND)",
  status: "Trạng thái", // optional cell value: "published" | "draft"
} as const

type Row = Record<string, unknown>

const cell = (row: Row, key: string): string | undefined => {
  const value = row[key]
  if (value === undefined || value === null) return undefined
  const str = String(value).trim()
  return str.length ? str : undefined
}

const parsePrice = (raw: string): number | undefined => {
  const digits = raw.replace(/[^\d]/g, "")
  if (!digits) return undefined
  return Number(digits)
}

/**
 * Updates existing products/variants from an Excel export. Matches rows to
 * catalog items by variant SKU; rows whose SKU isn't found are skipped (not
 * created) and reported at the end, so a typo never silently creates a
 * duplicate product.
 *
 * Usage: medusa exec ./src/scripts/import-products-excel.ts ./path/to/file.xlsx
 */
export default async function importProductsExcel({ container, args }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productModule = container.resolve(Modules.PRODUCT)

  const filePath = args[0]
  if (!filePath) {
    logger.error("import-products-excel: missing file path. Usage: medusa exec ./src/scripts/import-products-excel.ts <file.xlsx>")
    return
  }

  const workbook = XLSX.readFile(filePath)
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Row>(sheet, { defval: null })
  logger.info(`import-products-excel: read ${rows.length} row(s) from "${filePath}".`)

  const skippedNoSku: number[] = []
  const skippedNotFound: string[] = []
  const productUpdates = new Map<string, Record<string, unknown>>()
  const variantPriceUpdates: { id: string; prices: { currency_code: string; amount: number }[] }[] = []

  for (const [index, row] of rows.entries()) {
    const sku = cell(row, COLUMNS.sku)
    if (!sku) {
      skippedNoSku.push(index + 2) // +2: 1-indexed + header row
      continue
    }

    const [variant] = await productModule.listProductVariants({ sku: [sku] })
    if (!variant || !variant.product_id) {
      skippedNotFound.push(sku)
      continue
    }

    const title = cell(row, COLUMNS.title)
    const description = cell(row, COLUMNS.description)
    const status = cell(row, COLUMNS.status)
    const priceRaw = cell(row, COLUMNS.price)

    const update = productUpdates.get(variant.product_id) ?? {}
    if (title) update.title = title
    if (description) update.description = description
    if (status === "published" || status === "draft") update.status = status
    if (Object.keys(update).length) {
      productUpdates.set(variant.product_id, update)
    }

    if (priceRaw) {
      const amount = parsePrice(priceRaw)
      if (amount === undefined) {
        logger.warn(`import-products-excel: SKU ${sku} has an unparsable price "${priceRaw}", skipping price update for this row.`)
      } else {
        variantPriceUpdates.push({ id: variant.id, prices: [{ currency_code: "vnd", amount }] })
      }
    }
  }

  for (const [productId, update] of productUpdates) {
    await updateProductsWorkflow(container).run({
      input: { selector: { id: productId }, update },
    })
  }
  if (productUpdates.size) {
    logger.info(`import-products-excel: updated ${productUpdates.size} product(s) (title/description/status).`)
  }

  if (variantPriceUpdates.length) {
    await updateProductVariantsWorkflow(container).run({
      input: { product_variants: variantPriceUpdates },
    })
    logger.info(`import-products-excel: updated price for ${variantPriceUpdates.length} variant(s).`)
  }

  if (skippedNoSku.length) {
    logger.warn(`import-products-excel: skipped ${skippedNoSku.length} row(s) with no SKU (spreadsheet row(s): ${skippedNoSku.join(", ")}).`)
  }
  if (skippedNotFound.length) {
    logger.warn(`import-products-excel: skipped ${skippedNotFound.length} row(s) whose SKU wasn't found in the catalog: ${skippedNotFound.join(", ")}`)
  }

  logger.info("import-products-excel: done.")
}
