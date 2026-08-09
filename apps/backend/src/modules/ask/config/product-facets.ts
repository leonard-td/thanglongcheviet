/** Gift-shop facets skipped for TLCV — stub types for messages.ts / execute. */
export type ProductFacetKey = "audience" | "age_group" | "occasion"
export type ProductFacets = Partial<Record<ProductFacetKey, string>>

export const PRODUCT_FACET_KEYS: ProductFacetKey[] = []

export function sanitizePlanFacets(
  _facets: Record<string, string> | undefined
): ProductFacets | undefined {
  return undefined
}

export function hasFacetFilters(_facets?: Record<string, string>): boolean {
  return false
}

export function facetsToAttrPairs(_facets?: ProductFacets): string[] {
  return []
}
