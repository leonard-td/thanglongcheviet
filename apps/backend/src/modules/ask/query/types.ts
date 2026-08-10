import type { QueryLanguage } from '../classifier'

/** docs/24 §4 — stable while classifier maturity climbs. */
export type QueryType =
  | 'lexical'
  | 'semantic'
  | 'superlative'
  | 'aggregate'
  | 'filter'
  | 'lookup'
  | 'compound'
  | 'unknown'

export type QueryEntity = 'product' | 'order' | 'content' | 'unknown'

export type QueryPlan = {
  type: QueryType
  confidence: number
  entity?: QueryEntity
  sort?: { field: string; dir: 'asc' | 'desc'; limit: number }
  agg?: { op: 'count' | 'sum' | 'avg' | 'min' | 'max'; field?: string }
  filters?: Array<{ field: string; op: string; value: unknown }>
  /** Free-text leftover after stripping operators — keyword match only (docs/24 §6). */
  residual?: string
  lang: QueryLanguage
  raw: string
}

/** Confidence gates — docs/24 §7 (config, not inline magic). */
export const QUERY_CONFIDENCE_HIGH = 0.75
export const QUERY_CONFIDENCE_MED = 0.45
