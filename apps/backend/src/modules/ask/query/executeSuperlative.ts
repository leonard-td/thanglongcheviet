import { routes } from '../config/commerce'
import type { Answer, AnswerSource } from '../answer-types'
import { HIGH_THRESHOLD, ESCALATE_MESSAGE } from '../config/thresholds'
import {
  aggregateCountCopy,
  articleListCopy,
  askCopy,
  filterEmptyCopy,
  productListCopy,
} from '../config/messages'
import { searchCatalog } from '../search/search-catalog'
import type { SearchCatalogInput, CatalogSort } from '../search/catalog-query'
import type { QueryPlan } from './types'
import { QUERY_CONFIDENCE_MED } from './types'

function priceBounds(plan: QueryPlan): { priceMin?: number; priceMax?: number } {
  let priceMin: number | undefined
  let priceMax: number | undefined
  for (const f of plan.filters ?? []) {
    if (f.field !== 'price' || typeof f.value !== 'number') continue
    if (f.op === '<' || f.op === '<=') priceMax = f.value
    if (f.op === '>' || f.op === '>=') priceMin = f.value
  }
  return { priceMin, priceMax }
}

function optionBounds(plan: QueryPlan): { size?: string; color?: string } {
  let size: string | undefined
  let color: string | undefined
  for (const f of plan.filters ?? []) {
    if (f.field === 'option_size' && typeof f.value === 'string') size = f.value
    if (f.field === 'option_color' && typeof f.value === 'string') color = f.value
  }
  return { size, color }
}

function attrFacetBounds(plan: QueryPlan): string[] | undefined {
  const pairs = (plan.filters ?? [])
    .filter((f) => f.field === 'attr_facet' && typeof f.value === 'string')
    .map((f) => f.value as string)
  return pairs.length > 0 ? pairs : undefined
}

function facetsFromPlan(plan: QueryPlan): Record<string, string> | undefined {
  const out: Record<string, string> = {}
  for (const pair of attrFacetBounds(plan) ?? []) {
    const i = pair.indexOf('=')
    if (i <= 0) continue
    out[pair.slice(0, i)] = pair.slice(i + 1)
  }
  return Object.keys(out).length > 0 ? out : undefined
}

function hasStructuredConstraints(plan: QueryPlan): boolean {
  return (plan.filters ?? []).some((f) =>
    ['price', 'in_stock', 'option_size', 'option_color', 'attr_facet'].includes(f.field),
  )
}

function requiresInStock(plan: QueryPlan): boolean {
  return (plan.filters ?? []).some((f) => f.field === 'in_stock' && f.value === true)
}

function planToSearchInput(plan: QueryPlan): SearchCatalogInput | null {
  const { priceMin, priceMax } = priceBounds(plan)
  const opts = optionBounds(plan)
  const attrFacets = attrFacetBounds(plan)
  const bounds = {
    priceMin,
    priceMax,
    inStockOnly: requiresInStock(plan) || undefined,
    optionSize: opts.size,
    optionColor: opts.color,
    attrFacets,
  }
  const q = plan.residual?.trim() || undefined

  if (plan.type === 'filter') {
    return {
      q,
      collection: 'product',
      sort: 'rating',
      ...bounds,
    }
  }

  if (plan.type !== 'superlative' && plan.type !== 'compound') return null
  if (!plan.sort && plan.type === 'compound') {
    return { q, collection: 'product', sort: 'newest', ...bounds }
  }
  if (!plan.sort) return null

  if (plan.entity === 'content') {
    return { q, sort: 'newest' satisfies CatalogSort, collection: 'article', ...bounds }
  }

  const { field, dir } = plan.sort
  let sort: CatalogSort = 'newest'
  if (field === 'price' && dir === 'asc') sort = 'price_asc'
  else if (field === 'price' && dir === 'desc') sort = 'price_desc'
  else if (field === 'rating' || field === 'popularity' || field === 'units_sold') sort = 'rating'
  else if (field === 'published_at' || field === 'created_at') sort = 'newest'

  return { q, sort, collection: 'product', ...bounds }
}

function sortLabelKey(plan: QueryPlan): string {
  const field = plan.sort?.field
  const dir = plan.sort?.dir
  if (field === 'price' && dir === 'asc') return 'lowest-priced'
  if (field === 'price' && dir === 'desc') return 'highest-priced'
  if (field === 'rating' || field === 'popularity') return 'top-rated'
  if (field === 'published_at') return 'newest'
  if (plan.type === 'filter') return 'matching'
  return 'ranked'
}

/**
 * Execute structured superlative / filter / compound via searchCatalog (docs/24).
 * Residual free-text → `q` keyword only (docs/24 §6 thin — no hybrid).
 */
export async function executeStructuredPlan(plan: QueryPlan): Promise<Answer> {
  const lang = plan.lang

  if (plan.confidence < QUERY_CONFIDENCE_MED) {
    return {
      kind: 'escalated',
      channel: 'email',
      message: ESCALATE_MESSAGE,
    }
  }

  const input = planToSearchInput(plan)
  if (!input) {
    return {
      kind: 'escalated',
      channel: 'email',
      message: ESCALATE_MESSAGE,
    }
  }

  const limit = plan.sort?.limit ?? (plan.type === 'filter' ? 5 : 3)
  const hits = await searchCatalog(input)
  const stockOnly = requiresInStock(plan) || plan.type === 'superlative' || plan.type === 'compound'

  if (plan.entity === 'content' || input.collection === 'article') {
    return {
      kind: 'escalated',
      channel: 'email',
      message: askCopy(lang, 'articlesEmpty'),
    }
  }

  let products = hits.filter((h) => h.type === 'product').map((h) => h.product)
  if (stockOnly) {
    products = products.filter((p) => p.inStock)
  }
  products = products.slice(0, limit)

  if (products.length === 0) {
    const bound = priceBounds(plan)
    return {
      kind: 'resolved',
      content: hasStructuredConstraints(plan)
        ? filterEmptyCopy(lang, {
            facets: facetsFromPlan(plan),
            priceMin: bound.priceMin,
            priceMax: bound.priceMax,
            optionColor: optionBounds(plan).color,
            optionSize: optionBounds(plan).size,
          })
        : askCopy(lang, 'catalogEmpty'),
      sources: [],
      score: HIGH_THRESHOLD + 1,
    }
  }

  const bound = priceBounds(plan)
  const sources: AnswerSource[] = products.map((p) => ({
    title: p.title,
    href: routes.product(p.slug),
    snippet: p.description.slice(0, 120),
  }))

  return {
    kind: 'resolved',
    content: productListCopy(lang, {
      count: products.length,
      labelKey: sortLabelKey(plan),
      residual: plan.residual,
      priceMin: bound.priceMin,
      priceMax: bound.priceMax,
      facets: facetsFromPlan(plan),
    }),
    sources,
    score: HIGH_THRESHOLD + 1,
  }
}

/**
 * Thin aggregate count (docs/24 §5.2) — product catalog only; orders escalate.
 */
export async function executeAggregate(plan: QueryPlan): Promise<Answer> {
  const lang = plan.lang

  if (plan.confidence < QUERY_CONFIDENCE_MED) {
    return {
      kind: 'escalated',
      channel: 'email',
      message: ESCALATE_MESSAGE,
    }
  }

  if (plan.entity === 'order') {
    return {
      kind: 'escalated',
      channel: 'email',
      message: askCopy(lang, 'orderCountBlocked'),
    }
  }

  const { priceMin, priceMax } = priceBounds(plan)
  const q = plan.residual?.trim() || undefined
  const collection = plan.entity === 'content' ? 'article' : 'product'
  const attrFacets = attrFacetBounds(plan)
  const hits = await searchCatalog({
    q,
    collection,
    sort: 'newest',
    priceMin,
    priceMax,
    ...(attrFacets ? { attrFacets } : {}),
  })

  if (collection === 'article') {
    return {
      kind: 'resolved',
      content: aggregateCountCopy(lang, {
        count: 0,
        entity: 'article',
        residual: plan.residual,
      }),
      sources: [],
      score: HIGH_THRESHOLD + 1,
    }
  }

  let products = hits.filter((h) => h.type === 'product').map((h) => h.product)
  if (requiresInStock(plan)) {
    products = products.filter((p) => p.inStock)
  }
  const n = products.length

  const sources: AnswerSource[] = products.slice(0, 5).map((p) => ({
    title: p.title,
    href: routes.product(p.slug),
    snippet: p.description.slice(0, 120),
  }))

  return {
    kind: 'resolved',
    content: aggregateCountCopy(lang, {
      count: n,
      entity: 'product',
      residual: plan.residual,
      priceMin,
      priceMax,
      facets: facetsFromPlan(plan),
    }),
    sources,
    score: HIGH_THRESHOLD + 1,
  }
}

/** @deprecated Use executeStructuredPlan — kept for call-site clarity aliases. */
export const executeSuperlative = executeStructuredPlan
