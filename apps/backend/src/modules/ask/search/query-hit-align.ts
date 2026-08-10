/**
 * Precision gate when Cohere rerank is OFF — drop product hits that do not
 * share tokens with the query (esp. VI noise).
 */

import { expandQuery, synonyms } from "../config/synonyms"
import type { AskCatalogProduct } from "../catalog-context"
import type { SearchHit } from "./keyword-search"
import { productHaystack } from "./keyword-search"
import { isCohereRerankEnabled } from "../config/cohere-rerank"

const STOP = new Set([
  "a",
  "an",
  "and",
  "for",
  "in",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
  "là",
  "của",
  "cho",
  "với",
])

function tokens(q: string): string[] {
  return [
    ...new Set(
      q
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .filter((t) => t.length > 1 && !STOP.has(t))
    ),
  ]
}

export function shouldEnforceQueryHitAlign(): boolean {
  return !isCohereRerankEnabled()
}

export function productAlignsWithQuery(
  product: AskCatalogProduct,
  q: string
): boolean {
  const toks = tokens(q)
  if (toks.length === 0) return true
  const hay = productHaystack(product)
  const expanded = expandQuery(q)
  const all = new Set([...toks, ...tokens(expanded)])
  for (const t of all) {
    if (hay.includes(t)) return true
  }
  // synonym bags
  for (const [canon, alts] of Object.entries(synonyms)) {
    if (!toks.some((t) => t === canon || alts.includes(t))) continue
    if (hay.includes(canon) || alts.some((a) => hay.includes(a))) return true
  }
  return false
}

export function filterHitsAlignedToQuery(
  hits: readonly SearchHit[],
  q: string
): SearchHit[] {
  if (!shouldEnforceQueryHitAlign()) return [...hits]
  const qTrim = q.trim()
  if (!qTrim) return [...hits]
  return hits.filter((h) => {
    if (h.type !== "product") return true
    return productAlignsWithQuery(h.product, qTrim)
  })
}
