/**
 * Execute a MappedPlan via existing retrieval APIs (ADR-042).
 * Never invents catalog/policy text beyond askCopy / FAQ snippets.
 */

import { routes } from '../config/commerce'
import {
  facetsToAttrPairs,
  sanitizePlanFacets,
  type ProductFacets,
} from '../config/product-facets'
import { faqAnswerForLang, faqSnippets } from '../config/faq-snippets'
import {
  askCopy,
  filterEmptyCopy,
  lexicalMatchCopy,
  THANKS_QUERY_RE,
} from '../config/messages'
import { ESCALATE_MESSAGE, HIGH_THRESHOLD, MED_THRESHOLD } from '../config/thresholds'
import { isTeaLandingProduct } from '../config/ask-shop-catalog'
import { filterHitsAlignedToQuery } from '../search/query-hit-align'
import type { MappedPlan } from './types'
import { searchCatalog } from '../search/search-catalog'
import { listProducts } from '../catalog-context'
import type { Answer, AnswerSource } from '../answer-types'
import type { QueryPlan } from '../query/types'
import { executeAggregate, executeSuperlative } from '../query/executeSuperlative'
import { QUERY_CONFIDENCE_HIGH } from '../query/types'

function attrFacetsFromMapped(mapped: MappedPlan): string[] | undefined {
  const facets = sanitizePlanFacets(mapped.facets) as ProductFacets | undefined
  const pairs = facetsToAttrPairs(facets)
  return pairs.length > 0 ? pairs : undefined
}

function productSources(hits: Awaited<ReturnType<typeof searchCatalog>>): AnswerSource[] {
  return hits
    .filter((h) => h.type === 'product')
    .slice(0, 3)
    .map((h) => ({
      title: h.product.title,
      href: routes.product(h.product.slug),
      snippet: h.product.description.slice(0, 120),
    }))
}

function articleSources(_hits: Awaited<ReturnType<typeof searchCatalog>>): AnswerSource[] {
  // TLCV Ask is product-only (no blog leg in lib engine).
  return []
}

function broadenWithCategoryNeighbors(
  hits: Awaited<ReturnType<typeof searchCatalog>>,
  products: Awaited<ReturnType<typeof listProducts>>,
  bounds?: { priceMin?: number; priceMax?: number },
): AnswerSource[] {
  const initial = productSources(hits)
  if (initial.length >= 2) return initial

  const seen = new Set(initial.map((s) => s.href))
  const topProduct = hits.find((h) => h.type === 'product')?.product
  if (!topProduct) return initial

  const neighbors = products
    .filter((p) => {
      if (p.slug === topProduct.slug || p.category !== topProduct.category) return false
      if (isTeaLandingProduct(p)) return false
      if (bounds?.priceMin != null && p.price < bounds.priceMin) return false
      if (bounds?.priceMax != null && p.price > bounds.priceMax) return false
      return true
    })
    .sort(
      (a, b) =>
        Number(b.inStock) - Number(a.inStock) ||
        a.title.localeCompare(b.title),
    )
    .map((p) => ({
      title: p.title,
      href: routes.product(p.slug),
      snippet: p.description.slice(0, 120),
    }))
    .filter((s) => !seen.has(s.href))

  return [...initial, ...neighbors].slice(0, 3)
}

function mappedToQueryPlan(mapped: MappedPlan): QueryPlan {
  const filters: QueryPlan['filters'] = []
  if (mapped.priceMax != null) {
    filters.push({ field: 'price', op: '<', value: mapped.priceMax })
  }
  if (mapped.priceMin != null) {
    filters.push({ field: 'price', op: '>', value: mapped.priceMin })
  }
  if (mapped.inStockOnly) {
    filters.push({ field: 'in_stock', op: '=', value: true })
  }
  if (mapped.optionFilters?.size) {
    filters.push({ field: 'option_size', op: '=', value: mapped.optionFilters.size })
  }
  if (mapped.optionFilters?.color) {
    filters.push({ field: 'option_color', op: '=', value: mapped.optionFilters.color })
  }
  for (const pair of attrFacetsFromMapped(mapped) ?? []) {
    filters.push({ field: 'attr_facet', op: '=', value: pair })
  }

  let type: QueryPlan['type'] = 'lexical'
  if (mapped.route === 'filter') type = 'filter'
  else if (mapped.route === 'sort') type = mapped.q ? 'compound' : 'superlative'
  else if (mapped.route === 'aggregate') type = 'aggregate'
  else if (mapped.route === 'lexical') type = 'lexical'

  let sort: QueryPlan['sort']
  if (mapped.sort === 'price_asc') sort = { field: 'price', dir: 'asc', limit: 3 }
  else if (mapped.sort === 'price_desc') sort = { field: 'price', dir: 'desc', limit: 3 }
  else if (mapped.sort === 'rating') sort = { field: 'rating', dir: 'desc', limit: 3 }
  else if (mapped.sort === 'newest') sort = { field: 'published_at', dir: 'desc', limit: 3 }
  else if (mapped.route === 'filter') sort = { field: 'rating', dir: 'desc', limit: 5 }

  return {
    type,
    confidence: mapped.confidence,
    entity: mapped.entity ?? 'product',
    sort,
    filters: filters.length > 0 ? filters : undefined,
    residual: mapped.q,
    lang: mapped.lang,
    raw: mapped.raw,
    agg: mapped.route === 'aggregate' ? { op: 'count' } : undefined,
  }
}

export async function executeMappedPlan(
  mapped: MappedPlan,
  context: 'product' | 'support' = 'support',
): Promise<Answer> {
  const lang = mapped.lang
  const attrFacets = attrFacetsFromMapped(mapped)

  switch (mapped.route) {
    case 'courtesy':
      return {
        kind: 'resolved',
        content: askCopy(lang, THANKS_QUERY_RE.test(mapped.raw) ? 'thanks' : 'help'),
        sources: [],
        score: HIGH_THRESHOLD + 1,
      }
    case 'clarify':
      return {
        kind: 'escalated',
        channel: 'email',
        message:
          mapped.clarifyReason === 'promo'
            ? askCopy(lang, 'promoClarify')
            : mapped.clarifyReason === 'subjective'
              ? askCopy(lang, 'compare')
              : askCopy(lang, 'clarify'),
      }
    case 'escalate':
      return {
        kind: 'escalated',
        channel: 'email',
        message: ESCALATE_MESSAGE,
      }
    case 'faq': {
      const faq =
        faqSnippets.find((s) => s.id === mapped.faqId) ??
        faqSnippets.find((s) => s.id === 'support')
      if (!faq) {
        return {
          kind: 'escalated',
          channel: 'email',
          message: ESCALATE_MESSAGE,
        }
      }
      const content = faqAnswerForLang(faq, lang)
      return {
        kind: 'resolved',
        content,
        sources: [{ title: faq.question, href: faq.href, snippet: content.slice(0, 120) }],
        score: HIGH_THRESHOLD + 1,
      }
    }
    case 'aggregate': {
      return executeAggregate(mappedToQueryPlan(mapped))
    }
    case 'sort':
    case 'filter': {
      const plan = mappedToQueryPlan(mapped)
      const answer = await executeSuperlative(plan)
      if (
        answer.kind === 'resolved' &&
        mapped.confidence >= QUERY_CONFIDENCE_HIGH - 0.3 &&
        mapped.confidence < QUERY_CONFIDENCE_HIGH
      ) {
        answer.content = `${answer.content}\n\n${askCopy(lang, 'caveat')}`
      }
      if (answer.kind === 'resolved' && mapped.disclosure === 'featured_browse') {
        answer.content = `${askCopy(lang, 'featuredBrowse')}\n\n${answer.content}`
      }
      return answer
    }
    case 'lexical': {
      // Split legs (ADR-043): BM25 = residual (`q`); vector = `vectorQ`.
      // Empty residual must NOT fall back to raw BM25 (false empty / digit-title hits).
      const residual = mapped.q?.trim() || ''
      const hasOptionFilters = Boolean(mapped.optionFilters?.color || mapped.optionFilters?.size)
      const hasPriceBounds = mapped.priceMin != null || mapped.priceMax != null
      const facetBrowse = Boolean(attrFacets?.length) && !residual
      const optionBrowse = hasOptionFilters && !residual
      const priceBrowse = hasPriceBounds && !residual

      const hitsRaw = await searchCatalog({
        q: residual,
        ...(attrFacets ? { attrFacets } : {}),
        ...(mapped.optionFilters?.color ? { optionColor: mapped.optionFilters.color } : {}),
        ...(mapped.optionFilters?.size ? { optionSize: mapped.optionFilters.size } : {}),
        ...(mapped.priceMin != null ? { priceMin: mapped.priceMin } : {}),
        ...(mapped.priceMax != null ? { priceMax: mapped.priceMax } : {}),
        ...(facetBrowse ||
        optionBrowse ||
        priceBrowse ||
        (!residual && mapped.disclosure === 'featured_browse')
          ? { sort: 'rating' as const }
          : {}),
      })
      const hits = filterHitsAlignedToQuery(hitsRaw, residual || mapped.raw)

      const top = hits[0]
      const products = await listProducts()
      const catalogSources: AnswerSource[] = [
        ...broadenWithCategoryNeighbors(hits, products, {
          priceMin: mapped.priceMin,
          priceMax: mapped.priceMax,
        }),
        ...articleSources(hits),
      ].slice(0, 3)

      const preface = mapped.disclosure === 'featured_browse' ? askCopy(lang, 'featuredBrowse') : ''

      const withPreface = (body: string) => (preface ? `${preface}\n\n${body}` : body)

      const planFacets = sanitizePlanFacets(mapped.facets)

      if (
        (attrFacets?.length ||
          mapped.optionFilters?.color ||
          mapped.optionFilters?.size ||
          hasPriceBounds) &&
        hits.length === 0
      ) {
        return {
          kind: 'resolved',
          content: filterEmptyCopy(lang, {
            facets: planFacets,
            priceMin: mapped.priceMin,
            priceMax: mapped.priceMax,
            optionColor: mapped.optionFilters?.color,
            optionSize: mapped.optionFilters?.size,
          }),
          sources: [],
          score: HIGH_THRESHOLD + 1,
        }
      }

      if (context === 'product') {
        if (!top || top.score < MED_THRESHOLD) {
          return {
            kind: 'escalated',
            channel: 'email',
            message: ESCALATE_MESSAGE,
          }
        }
        if (top.score >= HIGH_THRESHOLD) {
          const productTitles = hits
            .filter((h) => h.type === 'product')
            .slice(0, 3)
            .map((h) => h.product.title)
          const fallback = top.type === 'product' ? top.product.title : ''
          return {
            kind: 'resolved',
            content: withPreface(
              lexicalMatchCopy(lang, {
                productTitles,
                fallbackTitle: fallback,
                facets: planFacets,
              }),
            ),
            sources: catalogSources,
            score: top.score,
          }
        }
        return {
          kind: 'suggested',
          options: catalogSources,
          note: withPreface(askCopy(lang, 'suggested')),
        }
      }

      if (top && top.score >= HIGH_THRESHOLD) {
        const productTitles = hits
          .filter((h) => h.type === 'product')
          .slice(0, 3)
          .map((h) => h.product.title)
        const fallback = top.type === 'product' ? top.product.title : ''
        return {
          kind: 'resolved',
          content: withPreface(
            lexicalMatchCopy(lang, {
              productTitles,
              fallbackTitle: fallback,
              facets: planFacets,
            }),
          ),
          sources: catalogSources,
          score: top.score,
        }
      }

      if (top && top.score >= MED_THRESHOLD) {
        return {
          kind: 'suggested',
          options: catalogSources,
          note: withPreface(askCopy(lang, 'suggested')),
        }
      }

      return {
        kind: 'resolved',
        content: askCopy(lang, 'catalogEmpty'),
        sources: [],
        score: 3,
      }
    }
    default:
      return {
        kind: 'escalated',
        channel: 'email',
        message: askCopy(lang, 'clarify'),
      }
  }
}
