/**
 * Ask query mapper — free-text → typed plan (ADR-042).
 * Never emits answer prose; execution stays on FAQ / catalog APIs.
 */

import type { QueryLanguage } from '../classifier'
import type { CatalogSort } from '../search/catalog-query'
import type { QueryEntity } from '../query/types'
import type { OptionFilters } from '../config/option-grammar'

export type MappedRoute =
  'faq' | 'sort' | 'filter' | 'lexical' | 'clarify' | 'escalate' | 'courtesy' | 'aggregate'

export type MappedPlan = {
  route: MappedRoute
  faqId?: string
  sort?: CatalogSort
  /** product | content | order — required for sort/aggregate execute paths */
  entity?: QueryEntity
  /** Lexical / compound keyword residual — BM25 leg only */
  q?: string
  /**
   * Text for hybrid vector embed (ADR-043). Soft-fit / prior-turn nouns may live
   * here when BM25 residual is empty — empty residual ≠ empty vector.
   */
  vectorQ?: string
  /**
   * Allowlisted classification facets (audience / age_group / occasion).
   * Executed as Typesense `attr_facets:=key=value` filters — not RegExp NLU.
   */
  facets?: Record<string, string>
  /**
   * Honest disclosure when browse has no product noun (featured rating).
   * Do not use for gender — that must be attr_facets on indexed catalog.
   */
  disclosure?: 'featured_browse'
  priceMin?: number
  priceMax?: number
  inStockOnly?: boolean
  optionFilters?: OptionFilters
  lang: QueryLanguage
  confidence: number
  source: 'rule' | 'llm'
  clarifyReason?: 'promo' | 'subjective'
  raw: string
}

export type QueryMapperInput = {
  q: string
  locale?: 'en' | 'vi'
  /** Last 2–3 turns for anaphora / facet overwrite (Phase D). */
  history?: readonly { role: 'user' | 'assistant'; content: string; productSlugs?: string[] }[]
}

export interface QueryMapper {
  map(input: QueryMapperInput): Promise<MappedPlan>
}
