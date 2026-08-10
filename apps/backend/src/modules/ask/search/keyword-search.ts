/**
 * Keyword search over Ask catalog products (lib engine).
 */

import type { AskCatalogProduct } from "../catalog-context"

export type SearchHit = {
  type: "product"
  id: string
  score: number
  product: AskCatalogProduct
}

const TITLE_WEIGHT = 2
const OTHER_WEIGHT = 1

const SEARCH_STOP = new Set([
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
  "một",
  "các",
  "những",
  "nào",
  "gì",
  "có",
])

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase()
}

function tokenizeQuery(query: string): string[] {
  return [
    ...new Set(
      normalizeQuery(query)
        .split(/\s+/)
        .filter((t) => t.length > 1 && !SEARCH_STOP.has(t))
    ),
  ]
}

function tokenInField(field: string, token: string): boolean {
  const hay = field.toLowerCase()
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  if (
    new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}(?:[^\\p{L}\\p{N}]|$)`, "u").test(
      hay
    )
  ) {
    return true
  }
  return token.length >= 4 && hay.includes(token)
}

function fieldTokenScore(
  value: string | undefined,
  tokens: readonly string[],
  weight: number
): number {
  if (!value) return 0
  let score = 0
  for (const token of tokens) {
    if (tokenInField(value, token)) score += weight
  }
  return score
}

function scoreProduct(
  product: AskCatalogProduct,
  tokens: readonly string[]
): number {
  return (
    fieldTokenScore(product.title, tokens, TITLE_WEIGHT) +
    fieldTokenScore(product.handle.replace(/-/g, " "), tokens, TITLE_WEIGHT) +
    fieldTokenScore(product.description, tokens, OTHER_WEIGHT) +
    fieldTokenScore(product.category, tokens, OTHER_WEIGHT)
  )
}

export function searchCatalog(
  query: string,
  products: readonly AskCatalogProduct[],
  _articles: readonly unknown[] = []
): SearchHit[] {
  const tokens = tokenizeQuery(query)
  if (tokens.length === 0) return []

  const hits: SearchHit[] = []
  for (const product of products) {
    const score = scoreProduct(product, tokens)
    if (score <= 0) continue
    hits.push({ type: "product", id: product.id, score, product })
  }
  return hits.sort(
    (a, b) => b.score - a.score || a.id.localeCompare(b.id)
  )
}

export function productHaystack(product: AskCatalogProduct): string {
  return [product.title, product.description, product.category]
    .join("\n")
    .toLowerCase()
}
