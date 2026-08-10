/**
 * Cohere Rerank — opt-in precision after Typesense hybrid (ADR-051 · docs/22-C §5).
 * Default OFF so CI stays key-free. Requires COHERE_API_KEY (same as embed).
 */

import { readCohereApiKey } from './commerce'

/** Pin — https://docs.cohere.com/reference/rerank */
export const COHERE_RERANK_MODEL = 'rerank-v3.5'

/** Max product candidates sent to Cohere (cost cap). */
export const COHERE_RERANK_TOP_N = 10

/** Drop products below this relevance (0–1 scale from Cohere). */
export const COHERE_RERANK_MIN_SCORE = 0.3

/**
 * Rerank is ON only when COHERE_RERANK=1|true|on **and** COHERE_API_KEY is set.
 */
export function isCohereRerankEnabled(): boolean {
  const flag = process.env.COHERE_RERANK?.trim().toLowerCase()
  if (flag !== '1' && flag !== 'true' && flag !== 'on') return false
  return Boolean(readCohereApiKey())
}
