/**
 * In-process Ask search engine over Medusa catalog snapshot.
 */

import { searchCatalog as matchCatalog } from "./keyword-search"
import type { SearchHit } from "./keyword-search"
import { getAskCatalog } from "../catalog-context"
import {
  filterProducts,
  normalizeSearchInput,
  rankedProductHits,
  sortProducts,
  type SearchCatalogInput,
} from "./catalog-query"

function applyKeywordThenSort(
  hits: SearchHit[],
  sort: NonNullable<ReturnType<typeof normalizeSearchInput>["sort"]>
): SearchHit[] {
  const products = hits.filter((h) => h.type === "product").map((h) => h.product)
  const sortedProducts = sortProducts(products, sort)
  return rankedProductHits(sortedProducts)
}

export type SearchEngine = {
  name: string
  search: (input: string | SearchCatalogInput) => Promise<SearchHit[]>
}

export const libSearchEngine: SearchEngine = {
  name: "lib",
  async search(input) {
    const {
      q,
      sort,
      priceMin,
      priceMax,
      inStockOnly,
      optionSize,
      optionColor,
      attrFacets,
    } = normalizeSearchInput(input)

    const products = filterProducts(getAskCatalog(), {
      priceMin,
      priceMax,
      inStockOnly,
      optionSize,
      optionColor,
      attrFacets,
    })

    if (!q) {
      if (!sort) return rankedProductHits(products).slice(0, 24)
      return rankedProductHits(sortProducts(products, sort)).slice(0, 24)
    }

    const hits = matchCatalog(q, products, [])
    if (sort) return applyKeywordThenSort(hits, sort)
    return hits
  },
}

export function getSearchEngine(): SearchEngine {
  return libSearchEngine
}

export function getSearchSource(): "lib" {
  return "lib"
}
