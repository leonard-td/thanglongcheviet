import { detectLanguage } from '../classifier'
import type { QueryPlan } from './types'
import { QUERY_CONFIDENCE_HIGH, QUERY_CONFIDENCE_MED } from './types'
import {
  AMBIGUOUS_CHEAP,
  AMBIGUOUS_TOP,
  BARE_HOT_PRODUCT,
  CONTENT_ENTITY,
  HOT_CONTENT,
  POPULAR_PRODUCT,
  PRICE_ASC,
  PRICE_DESC,
  SUPERLATIVE_MARKERS,
  CATALOG_BROWSE,
  OPEN_RECOMMEND,
} from '../config/superlative-grammar'
import { extractFilters, hasStructuredFilter } from '../config/filter-grammar'
import { aggregateEntity, isAggregateCount } from '../config/aggregate-grammar'
import { extractLexicalResidue } from './residual'

const DEFAULT_LIMIT = 3

function withFilters(plan: QueryPlan, extracted: ReturnType<typeof extractFilters>): QueryPlan {
  if (!hasStructuredFilter(extracted)) return plan
  const extra = [...extracted.filters]
  if (extracted.optionSize) {
    extra.push({ field: 'option_size', op: '=', value: extracted.optionSize })
  }
  if (extracted.optionColor) {
    extra.push({ field: 'option_color', op: '=', value: extracted.optionColor })
  }
  const next: QueryPlan = {
    ...plan,
    filters: [...(plan.filters ?? []), ...extra],
  }
  if (plan.type === 'superlative') {
    next.type = 'compound'
  } else if (plan.type === 'aggregate') {
    // keep aggregate; filters narrow the count
  } else if (plan.type === 'lexical' || plan.type === 'unknown') {
    next.type = 'filter'
    next.entity = next.entity ?? 'product'
    next.confidence = Math.max(next.confidence, QUERY_CONFIDENCE_HIGH)
  }
  return next
}

function withResidual(plan: QueryPlan): QueryPlan {
  if (plan.type === 'lexical') {
    const residual = extractLexicalResidue(plan.raw)
    return residual ? { ...plan, residual } : plan
  }
  if (
    plan.type !== 'filter' &&
    plan.type !== 'compound' &&
    plan.type !== 'superlative' &&
    plan.type !== 'aggregate'
  ) {
    return plan
  }
  const residual = extractLexicalResidue(plan.raw)
  if (!residual) return plan
  // Superlative + free-text noun → compound (sort ∩ residual keyword)
  if (plan.type === 'superlative') {
    const s = plan.raw.toLowerCase()
    if (OPEN_RECOMMEND.test(s) || CATALOG_BROWSE.test(s)) {
      return plan
    }
    return { ...plan, residual, type: 'compound' }
  }
  return { ...plan, residual }
}

/**
 * Rung-1 classifier + filter/aggregate + lexical residue (docs/24 §5–§6).
 */
export function classifyQueryType(q: string, locale?: 'en' | 'vi'): QueryPlan {
  const raw = q.trim()
  const lang = detectLanguage(raw, locale)
  const s = raw.toLowerCase()
  const extracted = extractFilters(s)

  if (!s) {
    return { type: 'unknown', confidence: 0, lang, raw }
  }

  let plan: QueryPlan

  if (isAggregateCount(s)) {
    const entity = aggregateEntity(s)
    plan = {
      type: 'aggregate',
      confidence: entity === 'order' ? QUERY_CONFIDENCE_MED : QUERY_CONFIDENCE_HIGH,
      entity,
      agg: { op: 'count' },
      lang,
      raw,
    }
  } else if (CONTENT_ENTITY.test(s) && HOT_CONTENT.test(s)) {
    plan = {
      type: 'superlative',
      confidence: QUERY_CONFIDENCE_HIGH,
      entity: 'content',
      sort: { field: 'published_at', dir: 'desc', limit: DEFAULT_LIMIT },
      lang,
      raw,
    }
  } else if (PRICE_ASC.test(s)) {
    plan = {
      type: 'superlative',
      confidence: QUERY_CONFIDENCE_HIGH,
      entity: 'product',
      sort: { field: 'price', dir: 'asc', limit: DEFAULT_LIMIT },
      lang,
      raw,
    }
  } else if (CATALOG_BROWSE.test(s) || OPEN_RECOMMEND.test(s)) {
    plan = {
      type: 'superlative',
      confidence: QUERY_CONFIDENCE_HIGH,
      entity: 'product',
      sort: { field: 'rating', dir: 'desc', limit: DEFAULT_LIMIT },
      lang,
      raw,
    }
  } else if (PRICE_DESC.test(s)) {
    plan = {
      type: 'superlative',
      confidence: QUERY_CONFIDENCE_HIGH,
      entity: 'product',
      sort: { field: 'price', dir: 'desc', limit: DEFAULT_LIMIT },
      lang,
      raw,
    }
  } else if (POPULAR_PRODUCT.test(s) || BARE_HOT_PRODUCT.test(s)) {
    plan = {
      type: 'superlative',
      confidence: QUERY_CONFIDENCE_HIGH,
      entity: 'product',
      sort: { field: 'rating', dir: 'desc', limit: DEFAULT_LIMIT },
      lang,
      raw,
    }
  } else if (AMBIGUOUS_TOP.test(s)) {
    plan = {
      type: 'superlative',
      confidence: QUERY_CONFIDENCE_MED,
      entity: 'product',
      sort: { field: 'rating', dir: 'desc', limit: DEFAULT_LIMIT },
      lang,
      raw,
    }
  } else if (AMBIGUOUS_CHEAP.test(s) && !PRICE_ASC.test(s) && !hasStructuredFilter(extracted)) {
    // bare "cheap" → clarify; "cheap laptop" → MED compound price_asc (docs/24 §7 log-driven)
    const residual = extractLexicalResidue(raw)
    if (residual) {
      plan = {
        type: 'compound',
        confidence: QUERY_CONFIDENCE_MED,
        entity: 'product',
        sort: { field: 'price', dir: 'asc', limit: DEFAULT_LIMIT },
        residual,
        lang,
        raw,
      }
    } else {
      plan = {
        type: 'unknown',
        confidence: 0.35,
        entity: 'product',
        lang,
        raw,
      }
    }
  } else if (
    SUPERLATIVE_MARKERS.test(s) &&
    /nhất|cheapest|priciest|most\s+|least\s+|highest|lowest/.test(s)
  ) {
    plan = {
      type: 'unknown',
      confidence: 0.3,
      entity: 'unknown',
      lang,
      raw,
    }
  } else {
    plan = {
      type: 'lexical',
      confidence: QUERY_CONFIDENCE_HIGH,
      lang,
      raw,
    }
  }

  if (plan.type === 'unknown' && AMBIGUOUS_CHEAP.test(s) && hasStructuredFilter(extracted)) {
    plan = {
      type: 'filter',
      confidence: QUERY_CONFIDENCE_HIGH,
      entity: 'product',
      lang,
      raw,
    }
  }

  return withResidual(withFilters(plan, extracted))
}
