import type { SearchHit } from './keyword-search'
import type { SearchCatalogInput } from './catalog-query'
import { getSearchEngine, getSearchSource } from './lib-engine'
import { libSearchEngine } from './lib-engine'
import { logMiss } from '../miss-log'
import { normalizeSearchInput } from './catalog-query'
import { detectLanguage } from '../classifier'
import { expandQuery } from '../config/synonyms'
import { productAlignsWithQuery, shouldEnforceQueryHitAlign } from './query-hit-align'
import {
  COHERE_RERANK_MIN_SCORE,
  COHERE_RERANK_TOP_N,
  isCohereRerankEnabled,
} from '../config/cohere-rerank'
import { readCohereApiKey } from '../config/commerce'
import { HIGH_THRESHOLD, MED_THRESHOLD } from '../config/thresholds'
import { productRerankText, rerankWithCohere } from './cohere-rerank'

const EXPANDED_SCORE_PENALTY = 0.75

/**
 * Synonym expand only when exact/hybrid returned no usable product hits.
 * Expanding VI→EN (e.g. áo khoác→jacket) after hybrid MED/HIGH would let BM25
 * drown semantic ranking with category neighbors (ADR-043 · docs/22-C).
 */
function hasUsableProductHit(hits: readonly SearchHit[]): boolean {
  return hits.some((hit) => hit.type === 'product' && hit.score >= MED_THRESHOLD)
}

function productHitCount(hits: readonly SearchHit[]): number {
  return hits.filter((hit) => hit.type === 'product').length
}

function withQuery(input: string | SearchCatalogInput, q: string): string | SearchCatalogInput {
  return typeof input === 'string' ? q : { ...input, q }
}

function mergeExpandedHits(
  exact: readonly SearchHit[],
  expanded: readonly SearchHit[],
): SearchHit[] {
  // Penalize expanded only when ranking against exact hits. Exact-empty → keep
  // expanded scores so synonym fills still clear MED/HIGH Ask thresholds.
  const penalizeExpanded = productHitCount(exact) > 0
  const seen = new Set<string>()
  const merged: SearchHit[] = []

  for (const hit of exact) {
    seen.add(`${hit.type}:${hit.id}`)
    merged.push(hit)
  }

  for (const hit of expanded) {
    const key = `${hit.type}:${hit.id}`
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(penalizeExpanded ? { ...hit, score: hit.score * EXPANDED_SCORE_PENALTY } : hit)
  }

  return merged.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
}

async function searchWithEngineFallback(
  input: string | SearchCatalogInput,
  opts?: { logZeroHits?: boolean },
): Promise<SearchHit[]> {
  const engine = getSearchEngine()
  if (engine.name === 'lib') {
    return engine.search(input)
  }

  try {
    const hits = await engine.search(input)
    if (hits.length === 0) {
      const libHits = await libSearchEngine.search(input)
      if (libHits.length > 0) {
        if (opts?.logZeroHits !== false) {
          const { q } = normalizeSearchInput(input)
          logMiss({
            q,
            kind: 'suggested',
            reason: 'typesense_zero_hits',
            lang: detectLanguage(q),
          })
        }
        return libHits
      }
    }
    return hits
  } catch {
    const { q } = normalizeSearchInput(input)
    logMiss({ q, kind: 'suggested', reason: 'typesense_degraded', lang: detectLanguage(q) })
    return libSearchEngine.search(input)
  }
}

/**
 * ADR-051: Cohere rerank products only. Fail-soft → keep pre-rerank hits.
 */
export async function applyProductRerank(
  q: string,
  hits: readonly SearchHit[],
): Promise<SearchHit[]> {
  if (!isCohereRerankEnabled() || !q.trim() || q === '*') return [...hits]
  const apiKey = readCohereApiKey()
  if (!apiKey) return [...hits]

  const products = hits.filter((h) => h.type === 'product').slice(0, COHERE_RERANK_TOP_N)
  const rest = hits.filter((h) => h.type !== 'product')
  if (products.length === 0) return [...hits]

  try {
    // VI→EN synonym expand so Cohere sees catalog nouns (e.g. lotus/tea), not only residual.
    const rerankQuery = expandQuery(q.trim()) || q.trim()
    const ranked = await rerankWithCohere({
      query: rerankQuery,
      documents: products.map((h) => ({
        id: h.id,
        text: productRerankText(h.product),
      })),
      apiKey,
      topN: COHERE_RERANK_TOP_N,
    })
    const byId = new Map(products.map((h) => [h.id, h]))
    const kept: SearchHit[] = []
    for (const row of ranked) {
      if (row.relevanceScore < COHERE_RERANK_MIN_SCORE) continue
      const hit = byId.get(row.id)
      if (!hit || hit.type !== 'product') continue
      // Preserve Ask HIGH gate; fractional part keeps Cohere order.
      kept.push({
        ...hit,
        score: HIGH_THRESHOLD + Math.min(0.99, Math.max(0, row.relevanceScore)),
      })
    }
    if (kept.length === 0 && products.length > 0) {
      logMiss({
        q,
        kind: 'suggested',
        reason: 'cohere_rerank_empty_floor',
        lang: detectLanguage(q),
      })
      const fallback = shouldEnforceQueryHitAlign()
        ? products.filter((h) => h.type === 'product' && productAlignsWithQuery(h.product, q))
        : products
      return [...(fallback.length > 0 ? fallback : products), ...rest]
    }
    return [...kept, ...rest]
  } catch {
    logMiss({
      q,
      kind: 'suggested',
      reason: 'cohere_rerank_degraded',
      lang: detectLanguage(q),
    })
    return [...hits]
  }
}

/**
 * Catalog search entry — pages/services call this (or search.service), never the engine directly.
 *
 * ALLOWED fallback (docs/22 §8.3): Typesense transport failure → lib engine so search pages do not hard-fail.
 * Not a product/chat fallback — logged for ops. Do not add new fallbacks here without ADR + docs/22 update.
 */
export async function searchCatalogQuery(input: string | SearchCatalogInput): Promise<SearchHit[]> {
  const exactHits = await searchWithEngineFallback(input)
  const { q } = normalizeSearchInput(input)
  // Empty / match-all BM25: do not synonym-expand (vector leg owns semantic recall).
  if (!q || q === '*') return exactHits

  let hits = exactHits
  const expandedQ = expandQuery(q)
  if (expandedQ && expandedQ !== q && !hasUsableProductHit(exactHits)) {
    const expandedHits = await searchWithEngineFallback(withQuery(input, expandedQ), {
      logZeroHits: false,
    })
    hits = mergeExpandedHits(exactHits, expandedHits)
  }

  return applyProductRerank(q, hits)
}

/** Alias used by mapper / executeSuperlative (CardDriven search.service). */
export const searchCatalog = searchCatalogQuery

export { getSearchSource }
