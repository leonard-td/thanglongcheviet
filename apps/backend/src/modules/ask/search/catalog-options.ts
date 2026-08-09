import type { AskCatalogProduct } from "../catalog-context"
import { isColorOptionName, isSizeOptionName } from "../config/option-grammar"
import { normalizeColorValue } from "../config/product-options"

export function productMatchesOptionFilters(
  product: AskCatalogProduct,
  opts: { size?: string; color?: string }
): boolean {
  const options = product.options ?? []
  if (opts.size) {
    const want = opts.size.toUpperCase()
    const hit = options.some(
      (o) => isSizeOptionName(o.name) && o.value.toUpperCase() === want
    )
    if (!hit) return false
  }
  if (opts.color) {
    const want = normalizeColorValue(opts.color)
    if (!want) return false
    const hit = options.some((o) => {
      if (!isColorOptionName(o.name)) return false
      return normalizeColorValue(o.value) === want
    })
    if (!hit) return false
  }
  return true
}
