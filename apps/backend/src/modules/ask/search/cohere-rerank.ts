/**
 * Cohere v2.rerank helper (ADR-051).
 * Official SDK only — never invent relevance in TS.
 */

import { CohereClient } from 'cohere-ai'
import { COHERE_RERANK_MODEL } from '../config/cohere-rerank'

export type RerankDocument = { id: string; text: string }

export type RerankResult = { id: string; relevanceScore: number }

export type RerankWithCohereDeps = {
  /** Injectable for unit tests — defaults to CohereClient.v2.rerank */
  rerankFn?: (args: {
    model: string
    query: string
    documents: string[]
    topN: number
  }) => Promise<{ results: Array<{ index: number; relevanceScore: number }> }>
}

/**
 * Rank documents by query relevance. Returns only ids present in `documents`,
 * ordered by descending relevanceScore.
 */
export async function rerankWithCohere(
  input: {
    query: string
    documents: readonly RerankDocument[]
    apiKey: string
    topN: number
  },
  deps?: RerankWithCohereDeps,
): Promise<RerankResult[]> {
  const query = input.query.trim()
  if (!query || input.documents.length === 0) return []

  const docs = input.documents.slice(0, Math.max(1, input.topN))
  const topN = Math.min(docs.length, Math.max(1, input.topN))

  const rerankFn =
    deps?.rerankFn ??
    (async (args) => {
      const cohere = new CohereClient({ token: input.apiKey })
      const response = await cohere.v2.rerank({
        model: args.model,
        query: args.query,
        documents: args.documents,
        topN: args.topN,
      })
      const results = (response.results ?? []).map((r) => ({
        index: r.index,
        relevanceScore: r.relevanceScore ?? 0,
      }))
      return { results }
    })

  const { results } = await rerankFn({
    model: COHERE_RERANK_MODEL,
    query,
    documents: docs.map((d) => d.text),
    topN,
  })

  const out: RerankResult[] = []
  for (const row of results) {
    const doc = docs[row.index]
    if (!doc) continue
    out.push({ id: doc.id, relevanceScore: row.relevanceScore })
  }
  return out
}

/** Compact product text for rerank (title + category + descr slice). */
export function productRerankText(product: {
  title: string
  category: string
  description: string
}): string {
  return [product.title, product.category, product.description.slice(0, 500)]
    .filter(Boolean)
    .join('\n')
    .slice(0, 2000)
}
