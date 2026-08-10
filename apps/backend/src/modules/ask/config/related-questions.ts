/**
 * Related Ask follow-up questions — deterministic POLICY (no LLM).
 * Max 3 chips; language follows the user query.
 */

import { matchFaqSnippet } from './faq-snippets'
import {
  CATALOG_EMPTY_MESSAGE,
  GREETING_QUERY_RE,
  HELP_QUERY_RE,
  THANKS_QUERY_RE,
} from './messages'
import { detectLanguage, type QueryLanguage } from '../classifier'
import { classifyQueryType } from '../query/classifyQueryType'
import { extractFilters, hasStructuredFilter } from './filter-grammar'
import { ESCALATE_MESSAGE, ESCALATE_MESSAGE_VI } from './thresholds'

export const RELATED_QUESTIONS_MAX = 3

export type RelatedQuestionBucket =
  | 'courtesy'
  | 'faq_shipping'
  | 'faq_returns'
  | 'faq_payment'
  | 'faq_orders'
  | 'faq_warranty'
  | 'faq_other'
  | 'sort'
  | 'products'
  | 'budget'
  | 'escalate'
  | 'facets'
  | 'default'

type LangPair = { en: string; vi: string }

const TABLES: Record<RelatedQuestionBucket, LangPair[]> = {
  courtesy: [
    { en: 'How long is shipping?', vi: 'Phí ship bao nhiêu?' },
    { en: 'Cheapest product', vi: 'Sản phẩm rẻ nhất' },
    { en: 'Lotus tea', vi: 'Chè ướp sen' },
  ],
  faq_shipping: [
    { en: 'What is your return policy?', vi: 'Đổi trả như thế nào?' },
    { en: 'What payment methods do you accept?', vi: 'Phương thức thanh toán?' },
    { en: 'Where is my order?', vi: 'Đơn hàng của tôi đâu?' },
  ],
  faq_returns: [
    { en: 'How long is shipping?', vi: 'Giao hàng mất bao lâu?' },
    { en: 'How can I contact support?', vi: 'Liên hệ hỗ trợ thế nào?' },
    { en: 'Where is my order?', vi: 'Đơn hàng của tôi đâu?' },
  ],
  faq_payment: [
    { en: 'Do you accept COD?', vi: 'COD được không?' },
    { en: 'How long is shipping?', vi: 'Phí ship bao nhiêu?' },
    { en: 'Where is my order?', vi: 'Đơn hàng của tôi đâu?' },
  ],
  faq_orders: [
    { en: 'How long is shipping?', vi: 'Giao hàng mất bao lâu?' },
    { en: 'What is your return policy?', vi: 'Đổi trả như thế nào?' },
    { en: 'How can I contact support?', vi: 'Liên hệ hỗ trợ thế nào?' },
  ],
  faq_warranty: [
    { en: 'What is your return policy?', vi: 'Đổi trả như thế nào?' },
    { en: 'How can I contact support?', vi: 'Liên hệ hỗ trợ thế nào?' },
    { en: 'Lotus tea', vi: 'Chè ướp sen' },
  ],
  faq_other: [
    { en: 'How long is shipping?', vi: 'Phí ship bao nhiêu?' },
    { en: 'What is your return policy?', vi: 'Đổi trả như thế nào?' },
    { en: 'Lotus tea', vi: 'Chè ướp sen' },
  ],
  sort: [
    { en: 'Cheapest product', vi: 'Sản phẩm rẻ nhất' },
    { en: 'How long is shipping?', vi: 'Phí ship bao nhiêu?' },
    { en: 'Jasmine tea', vi: 'Chè hoa nhài' },
  ],
  products: [
    { en: 'Lotus tea', vi: 'Chè ướp sen' },
    { en: 'How long is shipping?', vi: 'Phí ship bao nhiêu?' },
    { en: 'Products under 500k', vi: 'Sản phẩm dưới 500k' },
  ],
  budget: [
    { en: 'Lotus tea', vi: 'Chè ướp sen' },
    { en: 'Cheapest product', vi: 'Sản phẩm rẻ nhất' },
    { en: 'How long is shipping?', vi: 'Phí ship bao nhiêu?' },
  ],
  escalate: [
    { en: 'How long is shipping?', vi: 'Phí ship bao nhiêu?' },
    { en: 'Lotus tea', vi: 'Chè ướp sen' },
    { en: 'Cheapest product', vi: 'Sản phẩm rẻ nhất' },
  ],
  /** After honest facet/filter empty — suggest concrete catalog nouns. */
  facets: [
    { en: 'Lotus tea', vi: 'Chè ướp sen' },
    { en: 'Jasmine tea', vi: 'Chè hoa nhài' },
    { en: 'Corporate gifts', vi: 'Quà doanh nghiệp' },
  ],
  default: [
    { en: 'Lotus tea', vi: 'Chè ướp sen' },
    { en: 'How long is shipping?', vi: 'Giao hàng mất bao lâu?' },
    { en: 'Corporate tea gifts', vi: 'Quà tặng doanh nghiệp' },
  ],
}

function pick(lang: QueryLanguage, rows: LangPair[]): string[] {
  return rows.slice(0, RELATED_QUESTIONS_MAX).map((r) => (lang === 'vi' ? r.vi : r.en))
}

function faqBucket(faqId: string | undefined): RelatedQuestionBucket {
  switch (faqId) {
    case 'shipping':
      return 'faq_shipping'
    case 'returns':
      return 'faq_returns'
    case 'payment':
      return 'faq_payment'
    case 'orders':
      return 'faq_orders'
    case 'warranty':
      return 'faq_warranty'
    default:
      return 'faq_other'
  }
}

/** Infer follow-up bucket from the user question + assistant content. */
export function relatedQuestionBucket(input: {
  q: string
  assistantContent: string
  hasProductSuggestions: boolean
}): RelatedQuestionBucket {
  const q = input.q.trim()
  if (!q) return 'default'

  // Facet/price filter miss (ADR-044) — category chips before generic catalog-empty recovery.
  if (
    /Nothing in the catalog matches those filters|Hiện không có sản phẩm khớp bộ lọc/i.test(
      input.assistantContent,
    )
  ) {
    return 'facets'
  }

  if (
    input.assistantContent === ESCALATE_MESSAGE ||
    input.assistantContent === ESCALATE_MESSAGE_VI ||
    /leave your (email|contact)|để lại (email|thông tin)/i.test(input.assistantContent) ||
    input.assistantContent === CATALOG_EMPTY_MESSAGE ||
    /Không tìm thấy sản phẩm|could not find|Try another keyword|Thử từ khóa|xem Shop|browse the Shop/i.test(
      input.assistantContent,
    )
  ) {
    return 'escalate'
  }

  if (GREETING_QUERY_RE.test(q) || HELP_QUERY_RE.test(q) || THANKS_QUERY_RE.test(q)) {
    return 'courtesy'
  }

  const faq = matchFaqSnippet(q)
  if (faq && !input.hasProductSuggestions) {
    return faqBucket(faq.id)
  }

  const plan = classifyQueryType(q)
  const extracted = extractFilters(q.toLowerCase())
  if (
    hasStructuredFilter(extracted) &&
    (extracted.priceMin != null || extracted.priceMax != null)
  ) {
    return 'budget'
  }
  if (plan.type === 'superlative' || plan.type === 'compound') {
    if (plan.sort?.field === 'price' && hasStructuredFilter(extracted)) return 'budget'
    if (plan.sort) return 'sort'
  }
  if (plan.type === 'filter') return 'budget'
  if (input.hasProductSuggestions) return 'products'

  return 'default'
}

/**
 * Related follow-up questions for an Ask turn.
 * Drops chips that exactly match the current user question (case-insensitive).
 */
export function relatedQuestionsFor(input: {
  q: string
  assistantContent: string
  hasProductSuggestions?: boolean
  lang?: QueryLanguage
}): string[] {
  const lang = input.lang ?? detectLanguage(input.q)
  const bucket = relatedQuestionBucket({
    q: input.q,
    assistantContent: input.assistantContent,
    hasProductSuggestions: Boolean(input.hasProductSuggestions),
  })
  const needles = pick(lang, TABLES[bucket])
  const current = input.q.trim().toLowerCase()
  return needles.filter((n) => n.trim().toLowerCase() !== current).slice(0, RELATED_QUESTIONS_MAX)
}
