/**
 * Normalize / filter / sort Ask catalog for lib search.
 */

import type { AskCatalogProduct } from "../catalog-context"
import type { SearchHit } from "./keyword-search"
import { HIGH_THRESHOLD } from "../config/thresholds"
import { productMatchesOptionFilters } from "./catalog-options"

export type CatalogSort = "price_asc" | "price_desc" | "rating" | "newest"

export type SearchCatalogInput = {
  q?: string
  sort?: CatalogSort
  collection?: string
  priceMin?: number
  priceMax?: number
  inStockOnly?: boolean
  optionSize?: string
  optionColor?: string
  attrFacets?: string[]
}

export function normalizeSearchInput(
  input: string | SearchCatalogInput
): Required<
  Pick<SearchCatalogInput, "q">
> &
  SearchCatalogInput {
  if (typeof input === "string") {
    return { q: input.trim() }
  }
  return {
    ...input,
    q: (input.q ?? "").trim(),
  }
}

export function filterProducts(
  products: readonly AskCatalogProduct[],
  opts: {
    priceMin?: number
    priceMax?: number
    inStockOnly?: boolean
    optionSize?: string
    optionColor?: string
    attrFacets?: string[]
  }
): AskCatalogProduct[] {
  return products.filter((p) => {
    if (opts.priceMin != null && p.price < opts.priceMin) return false
    if (opts.priceMax != null && p.price > opts.priceMax) return false
    if (opts.inStockOnly && !p.inStock) return false
    if (opts.optionSize || opts.optionColor) {
      if (
        !productMatchesOptionFilters(p, {
          size: opts.optionSize,
          color: opts.optionColor,
        })
      ) {
        return false
      }
    }
    // attrFacets unused on TLCV (no gift facets)
    return true
  })
}

export function sortProducts(
  products: readonly AskCatalogProduct[],
  sort: CatalogSort
): AskCatalogProduct[] {
  const copy = [...products]
  if (sort === "price_asc") {
    copy.sort((a, b) => a.price - b.price || a.id.localeCompare(b.id))
  } else if (sort === "price_desc") {
    copy.sort((a, b) => b.price - a.price || a.id.localeCompare(b.id))
  } else {
    // rating / newest — stable by id (no rating field in Medusa MVP)
    copy.sort((a, b) => a.id.localeCompare(b.id))
  }
  return copy
}

export function sortArticles(_articles: readonly unknown[], _sort: CatalogSort) {
  return [] as unknown[]
}

export function rankedProductHits(
  products: readonly AskCatalogProduct[],
  baseScore = HIGH_THRESHOLD
): SearchHit[] {
  return products.map((product, i) => ({
    type: "product" as const,
    id: product.id,
    score: baseScore - i * 0.01,
    product,
  }))
}

export function rankedArticleHits(_articles: readonly unknown[]): SearchHit[] {
  return []
}
