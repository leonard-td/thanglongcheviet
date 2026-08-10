/**
 * Rule QueryMapper — wraps Rung-1 classifier + FAQ (ADR-042 default).
 * Classification facets (audience/…) come from LLM MappedPlan when ASK_NLU_PROVIDER=llm.
 * Rules do not RegExp-parse gender (grammar freeze / DATA-PLACEMENT-MAP).
 */

import { matchFaqSnippet } from '../config/faq-snippets'
import {
  COMPARE_QUERY_RE,
  GREETING_QUERY_RE,
  HELP_QUERY_RE,
  SUBJECTIVE_COMPARE_RE,
  THANKS_QUERY_RE,
} from '../config/messages'
import { matchIntent } from '../config/intents'
import { sanitizePlanOptions } from '../config/product-options'
import { detectLanguage } from '../classifier'
import { classifyQueryType } from '../query/classifyQueryType'
import { QUERY_CONFIDENCE_HIGH, QUERY_CONFIDENCE_MED } from '../query/types'
import type { CatalogSort } from '../search/catalog-query'
import type { MappedPlan, QueryMapper, QueryMapperInput } from './types'
import { isPromoWithoutEntity, resolveSessionQuery } from './session-context'

function sortFromPlan(plan: ReturnType<typeof classifyQueryType>): CatalogSort | undefined {
  if (!plan.sort) return undefined
  const { field, dir } = plan.sort
  if (field === 'price' && dir === 'asc') return 'price_asc'
  if (field === 'price' && dir === 'desc') return 'price_desc'
  if (field === 'rating' || field === 'popularity' || field === 'units_sold') return 'rating'
  if (field === 'published_at' || field === 'created_at') return 'newest'
  return 'newest'
}

function priceBounds(plan: ReturnType<typeof classifyQueryType>): {
  priceMin?: number
  priceMax?: number
} {
  let priceMin: number | undefined
  let priceMax: number | undefined
  for (const f of plan.filters ?? []) {
    if (f.field !== 'price' || typeof f.value !== 'number') continue
    if (f.op === '<' || f.op === '<=') priceMax = f.value
    if (f.op === '>' || f.op === '>=') priceMin = f.value
  }
  return { priceMin, priceMax }
}

function optionFiltersFromPlan(
  plan: ReturnType<typeof classifyQueryType>,
): MappedPlan['optionFilters'] | undefined {
  let size: string | undefined
  let color: string | undefined
  for (const f of plan.filters ?? []) {
    if (f.field === 'option_size' && typeof f.value === 'string') size = f.value
    if (f.field === 'option_color' && typeof f.value === 'string') color = f.value
  }
  return sanitizePlanOptions({ size, color })
}

export const ruleQueryMapper: QueryMapper = {
  async map(input: QueryMapperInput): Promise<MappedPlan> {
    const { q: sessionQ } = resolveSessionQuery(input.q, input.history)
    const raw = sessionQ.trim()
    const lang = detectLanguage(raw, input.locale)

    if (!raw) {
      return { route: 'escalate', lang, confidence: 1, source: 'rule', raw: input.q.trim() }
    }

    if (THANKS_QUERY_RE.test(raw)) {
      return {
        route: 'courtesy',
        lang,
        confidence: QUERY_CONFIDENCE_HIGH + 0.1,
        source: 'rule',
        raw,
      }
    }

    if (GREETING_QUERY_RE.test(raw) || HELP_QUERY_RE.test(raw)) {
      return {
        route: 'courtesy',
        lang,
        confidence: QUERY_CONFIDENCE_HIGH + 0.1,
        source: 'rule',
        raw,
      }
    }

    if (SUBJECTIVE_COMPARE_RE.test(raw)) {
      return {
        route: 'clarify',
        clarifyReason: 'subjective',
        lang,
        confidence: QUERY_CONFIDENCE_HIGH,
        source: 'rule',
        raw,
      }
    }

    if (COMPARE_QUERY_RE.test(raw)) {
      return {
        route: 'clarify',
        clarifyReason: 'subjective',
        lang,
        confidence: QUERY_CONFIDENCE_HIGH,
        source: 'rule',
        raw,
      }
    }

    if (isPromoWithoutEntity(raw, input.history)) {
      return {
        route: 'clarify',
        clarifyReason: 'promo',
        lang,
        confidence: QUERY_CONFIDENCE_HIGH,
        source: 'rule',
        raw,
      }
    }

    if (matchIntent(raw)?.sensitive) {
      return {
        route: 'escalate',
        lang,
        confidence: QUERY_CONFIDENCE_HIGH,
        source: 'rule',
        raw,
      }
    }

    const plan = classifyQueryType(raw, input.locale)
    const bounds = priceBounds(plan)
    const optionFilters = optionFiltersFromPlan(plan)
    const inStockOnly = (plan.filters ?? []).some((f) => f.field === 'in_stock' && f.value === true)

    const shared = {
      lang: plan.lang,
      confidence: plan.confidence,
      source: 'rule' as const,
      raw,
      q: plan.residual,
      ...bounds,
      inStockOnly: inStockOnly || undefined,
      optionFilters,
    }

    if (plan.type === 'aggregate' && plan.confidence >= QUERY_CONFIDENCE_MED) {
      return {
        route: 'aggregate',
        entity: plan.entity,
        ...shared,
      }
    }

    if (plan.type === 'filter' && plan.confidence >= QUERY_CONFIDENCE_MED) {
      return {
        route: 'filter',
        entity: plan.entity ?? 'product',
        sort: 'rating',
        ...shared,
      }
    }

    if (
      (plan.type === 'superlative' || plan.type === 'compound') &&
      plan.confidence >= QUERY_CONFIDENCE_MED &&
      plan.sort
    ) {
      return {
        route: 'sort',
        entity: plan.entity ?? 'product',
        sort: sortFromPlan(plan),
        ...shared,
      }
    }

    const faq = matchFaqSnippet(raw)
    if (faq) {
      return {
        route: 'faq',
        faqId: faq.id,
        lang,
        confidence: QUERY_CONFIDENCE_HIGH,
        source: 'rule',
        raw,
      }
    }

    if (plan.type === 'lexical' && plan.confidence >= QUERY_CONFIDENCE_MED) {
      const residual = plan.residual?.trim() ?? ''
      if (!residual) {
        // Soft gift / open ask with no noun: honest featured browse (not a gender claim).
        return {
          route: 'sort',
          entity: 'product',
          sort: 'rating',
          disclosure: 'featured_browse',
          lang: plan.lang,
          confidence: plan.confidence,
          source: 'rule',
          raw: input.q.trim(),
        }
      }
      return {
        route: 'lexical',
        q: residual,
        lang: plan.lang,
        confidence: plan.confidence,
        source: 'rule',
        raw: input.q.trim(),
      }
    }

    return {
      route: 'clarify',
      lang: plan.lang,
      confidence: Math.max(plan.confidence, 0.3),
      source: 'rule',
      raw,
    }
  },
}
