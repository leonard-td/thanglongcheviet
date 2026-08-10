/**
 * Typesense BM25 (+ optional hybrid vector) Ask search engine.
 * Hydrates hits from in-process Ask catalog (images/prices) by id/slug.
 */

import { getAskCatalog } from "../../catalog-context"
import type { AskCatalogProduct } from "../../catalog-context"
import {
  isTypesenseHybridEnabled,
  readCohereApiKey,
  TYPESENSE_HYBRID_ALPHA,
  TYPESENSE_HYBRID_K,
} from "../../config/commerce"
import { HIGH_THRESHOLD, MED_THRESHOLD } from "../../config/thresholds"
import type { SearchEngine } from "../lib-engine"
import {
  normalizeSearchInput,
  rankedProductHits,
  type CatalogSort,
  type SearchCatalogInput,
} from "../catalog-query"
import type { SearchHit } from "../keyword-search"
import { createTypesenseClient } from "./client"
import { embedTextsCohere } from "./cohere-embed"
import { PRODUCTS_COLLECTION } from "./schemas"

type TypesenseHit<T> = {
  document: T
  text_match?: number
  vector_distance?: number
  hybrid_search_info?: { rank_fusion_score?: number }
}

const PRODUCT_QUERY_BY_LEXICAL = "name,category,tags,descr,handle"

function hybridVectorQuery(queryEmbedding: number[]): string {
  return `embedding:([${queryEmbedding.join(",")}], k: ${TYPESENSE_HYBRID_K}, alpha: ${TYPESENSE_HYBRID_ALPHA})`
}

function mapScore(textMatch: number | undefined, rank: number): number {
  if (!textMatch || textMatch <= 0) return 0
  if (rank === 0 || textMatch >= 1_000_000) return HIGH_THRESHOLD
  return MED_THRESHOLD
}

export function mapTypesenseHitScore(
  hit: Pick<
    TypesenseHit<unknown>,
    "text_match" | "vector_distance" | "hybrid_search_info"
  >,
  rank: number,
  hybrid: boolean
): number {
  const textScore = mapScore(hit.text_match, rank)
  if (textScore > 0) return textScore

  if (!hybrid) return 0

  const fusion = hit.hybrid_search_info?.rank_fusion_score
  if (typeof fusion === "number") {
    if (fusion >= 0.3) return HIGH_THRESHOLD
    if (fusion >= 0.12) return MED_THRESHOLD
    return 0
  }

  if (typeof hit.vector_distance === "number") {
    if (hit.vector_distance <= 0.55) return HIGH_THRESHOLD
    if (hit.vector_distance <= 0.72) return MED_THRESHOLD
    return 0
  }

  return 0
}

function productFilter(
  priceMin?: number,
  priceMax?: number,
  opts?: { inStockOnly?: boolean }
): string | undefined {
  const parts: string[] = []
  if (priceMin !== undefined) parts.push(`sale_price:>=${priceMin}`)
  if (priceMax !== undefined) parts.push(`sale_price:<=${priceMax}`)
  if (opts?.inStockOnly) parts.push("in_stock:true")
  return parts.length > 0 ? parts.join(" && ") : undefined
}

function typesenseProductSortBy(sort: CatalogSort): string {
  if (sort === "price_asc") return "sale_price:asc"
  if (sort === "price_desc") return "sale_price:desc"
  return "popularity:desc"
}

function resolveProduct(
  doc: { id?: string; slug?: string; handle?: string },
  byId: Map<string, ReturnType<typeof getAskCatalog>[number]>,
  bySlug: Map<string, ReturnType<typeof getAskCatalog>[number]>
) {
  if (doc.id) {
    const byExactId = byId.get(doc.id)
    if (byExactId) return byExactId
  }
  const slug = doc.slug || doc.handle
  if (slug) return bySlug.get(slug)
  return undefined
}

export function createTypesenseSearchEngine(
  client: ReturnType<typeof createTypesenseClient> = createTypesenseClient()
): SearchEngine {
  return {
    name: "typesense",
    async search(input: string | SearchCatalogInput) {
      const { q, sort, priceMin, priceMax, inStockOnly } =
        normalizeSearchInput(input)

      const hybrid = isTypesenseHybridEnabled()
      const apiKey = readCohereApiKey()

      if (!q && sort) {
        return browseSorted(client, {
          sort,
          priceMin,
          priceMax,
          inStockOnly,
        })
      }

      if (!q) {
        return browseSorted(client, {
          sort: "rating",
          priceMin,
          priceMax,
          inStockOnly,
        })
      }

      let queryEmbedding: number[] | undefined
      if (hybrid && apiKey && q.trim()) {
        const [vec] = await embedTextsCohere([q.trim()], "search_query", apiKey)
        queryEmbedding = vec
      }

      const products = getAskCatalog()
      const productById = new Map(products.map((p) => [p.id, p]))
      const productBySlug = new Map(products.map((p) => [p.slug, p]))

      const filterBy = productFilter(priceMin, priceMax, { inStockOnly })
      const searchParams: Record<string, unknown> = {
        q,
        query_by: PRODUCT_QUERY_BY_LEXICAL,
        per_page: 20,
        ...(filterBy ? { filter_by: filterBy } : {}),
        ...(sort ? { sort_by: typesenseProductSortBy(sort) } : {}),
      }
      if (queryEmbedding?.length) {
        searchParams.vector_query = hybridVectorQuery(queryEmbedding)
        searchParams.exclude_fields = "embedding"
      }

      const response = (await client
        .collections(PRODUCTS_COLLECTION)
        .documents()
        .search(searchParams)) as {
        hits?: TypesenseHit<{ id: string; slug?: string; handle?: string }>[]
      }

      const hits: SearchHit[] = []
      const seen = new Set<string>()
      const hybridActive = Boolean(queryEmbedding)
      const productResults = Array.isArray(response.hits) ? response.hits : []

      for (const [rank, hit] of productResults.entries()) {
        const product = resolveProduct(
          hit.document,
          productById,
          productBySlug
        )
        if (!product) continue
        const base = sort
          ? HIGH_THRESHOLD + 1
          : mapTypesenseHitScore(hit, rank, hybridActive)
        if (base <= 0) continue
        const score = base + (100 - Math.min(rank, 99)) / 100_000
        if (seen.has(product.id)) continue
        seen.add(product.id)
        hits.push({ type: "product", id: product.id, score, product })
      }

      if (sort) return hits
      return hits.sort(
        (a, b) => b.score - a.score || a.id.localeCompare(b.id)
      )
    },
  }
}

async function browseSorted(
  client: ReturnType<typeof createTypesenseClient>,
  opts: {
    sort: CatalogSort
    priceMin?: number
    priceMax?: number
    inStockOnly?: boolean
  }
): Promise<SearchHit[]> {
  const products = getAskCatalog()
  const productById = new Map(products.map((p) => [p.id, p]))
  const productBySlug = new Map(products.map((p) => [p.slug, p]))

  const filterBy = productFilter(opts.priceMin, opts.priceMax, {
    inStockOnly: opts.inStockOnly,
  })

  const response = (await client
    .collections(PRODUCTS_COLLECTION)
    .documents()
    .search({
      q: "*",
      query_by: "name",
      per_page: 50,
      sort_by: typesenseProductSortBy(opts.sort),
      ...(filterBy ? { filter_by: filterBy } : {}),
    })) as {
    hits?: TypesenseHit<{ id: string; slug?: string; handle?: string }>[]
  }

  const ordered: AskCatalogProduct[] = []
  for (const hit of response.hits ?? []) {
    const product = resolveProduct(hit.document, productById, productBySlug)
    if (product) ordered.push(product)
  }

  return rankedProductHits(ordered)
}

let cachedTypesenseEngine: SearchEngine | null = null

export function getTypesenseSearchEngine(): SearchEngine {
  if (!cachedTypesenseEngine) {
    cachedTypesenseEngine = createTypesenseSearchEngine()
  }
  return cachedTypesenseEngine
}

/** Test helper — drop cached engine after env flag changes. */
export function resetTypesenseSearchEngineCache(): void {
  cachedTypesenseEngine = null
}
