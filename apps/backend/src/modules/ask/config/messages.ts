import type { QueryLanguage } from '../classifier'
import { DEFAULT_CATALOG_CURRENCY, type CatalogCurrency } from './commerce'
import type { ProductFacetKey } from './product-facets'

type LangCopy = { en: string; vi: string }

function pick(lang: QueryLanguage, copy: LangCopy): string {
  return lang === 'vi' ? copy.vi : copy.en
}

/** Copy for `suggested` answers when catalog search returns real hits (docs/22 §8.3). */
export const SUGGESTED_MATCHES_NOTE = 'Here are some close matches.'

const SUGGESTED_MATCHES: LangCopy = {
  en: 'Here are some close matches.',
  vi: 'Đây là một số kết quả gần đúng.',
}

/** docs/24 §7 — low-confidence query understanding (clarify, do not BM25-guess). */
export const CLARIFY_QUERY_MESSAGE =
  'I am not sure what you want ranked. Try “cheapest product”, “most expensive product”, or “newest article”.'

const CLARIFY_QUERY: LangCopy = {
  en: CLARIFY_QUERY_MESSAGE,
  vi: 'Mình chưa chắc bạn muốn xếp hạng thế nào. Thử “sản phẩm rẻ nhất”, “sản phẩm đắt nhất”, hoặc “bài viết mới nhất”.',
}

/** Appended when MED confidence superlative still executes (docs/24 §7). */
export const SUPERLATIVE_CAVEAT_NOTE =
  'If that was not what you meant, try asking for cheapest, most expensive, or newest instead.'

const SUPERLATIVE_CAVEAT: LangCopy = {
  en: SUPERLATIVE_CAVEAT_NOTE,
  vi: 'Nếu chưa đúng ý, thử hỏi sản phẩm rẻ nhất, đắt nhất, hoặc mới nhất.',
}

/**
 * Short greetings — help copy, not escalate (AP-32 still: no invented products).
 * Keep in sync with Ask panel greeting intent in `messages/*.json` ask.greeting.
 */
export const ASK_HELP_MESSAGE =
  'Hi! Tell me what you need — products, shipping, returns, payment, or an order. I can suggest items or point you to policy answers.'

const ASK_HELP: LangCopy = {
  en: ASK_HELP_MESSAGE,
  vi: 'Xin chào! Bạn cần gì — sản phẩm, giao hàng, đổi trả, thanh toán, hay đơn hàng? Mình có thể gợi ý sản phẩm hoặc chỉ đến câu trả lời chính sách.',
}

export const THANKS_MESSAGE =
  'You’re welcome! Ask about a product, shipping, returns, payment, or an order anytime.'

const THANKS: LangCopy = {
  en: THANKS_MESSAGE,
  vi: 'Không có gì! Bạn cứ hỏi về sản phẩm, giao hàng, đổi trả, thanh toán hoặc đơn hàng nhé.',
}

/** Catalog miss — shop CTA, not email escalate (AP-32: no random product substitute). */
export const CATALOG_EMPTY_MESSAGE =
  'I couldn’t find matching products for that. Try another keyword, or browse the Shop.'

const CATALOG_EMPTY: LangCopy = {
  en: CATALOG_EMPTY_MESSAGE,
  vi: 'Không tìm thấy sản phẩm phù hợp. Thử từ khóa khác, hoặc xem Shop.',
}

/** Honest filter miss — price/size/color/facet bounds matched nothing (AP-32). */
export const FILTER_EMPTY_MESSAGE =
  'Nothing in the catalog matches those filters right now. Try different criteria or browse the Shop.'

const FILTER_EMPTY: LangCopy = {
  en: FILTER_EMPTY_MESSAGE,
  vi: 'Hiện không có sản phẩm khớp bộ lọc đó. Thử tiêu chí khác hoặc xem Shop.',
}

const PROMO_CLARIFY: LangCopy = {
  en: 'I can’t check discounts from here. Open a product page or ask about shipping and returns.',
  vi: 'Mình chưa kiểm tra giảm giá từ đây được. Mở trang sản phẩm hoặc hỏi về giao hàng và đổi trả nhé.',
}

const ARTICLES_EMPTY: LangCopy = {
  en: 'No articles are available right now.',
  vi: 'Hiện chưa có bài viết nào.',
}

const ORDER_COUNT_BLOCKED: LangCopy = {
  en: 'I can’t count orders from Ask yet. Sign in and open your account orders, or contact support.',
  vi: 'Ask chưa đếm được đơn hàng. Đăng nhập và mở Account → Orders, hoặc liên hệ hỗ trợ.',
}

/** Exact-ish greeting turns (EN + VI). Not substring — avoids “ship” false positives. */
export const GREETING_QUERY_RE =
  /^(hi|hello|hey|yo|chào|xin chào|alo)([\s!,.]*|[\s]+(bạn|ban|shop|ad|anh|chị|chi|em|there)[\s!,.]*)?$/i

export const THANKS_QUERY_RE =
  /^(thanks|thank you|cảm ơn|cám ơn|cam on)(\s+(nhiều|nhieu))?(?:\s+(shop|bạn|ban|nhé|nhe|ạ|a))?[\s!,.]*$/i

/** Bare help / vague recommend — orient, don’t jump to contact FAQ or escalate. */
export const HELP_QUERY_RE =
  /^(help|giúp|giup|giúp\s+(?:tôi|mình)|help\s+me|gợi\s+ý|goi\s+y)([\s!,.?]*)$/i

/** Subjective compare without product nouns — clarify, not lexical empty. */
export const SUBJECTIVE_COMPARE_RE =
  /^(cái|con|món)\s+nào\s+.+\s+hơn\??$|^(which|what)\s+(one|is)\s+.+\s+better\??$/i

/** Compare / side-by-side — out of V1 Ask scope (docs/03). */
export const COMPARE_QUERY_RE =
  /\b(compare|comparison|vs\.?|versus)\b|so\s*sánh|so\s*sanh|đối\s*chiếu|doi\s*chieu|chọn\s+giữa|chon\s+giua|đáng\s+mua\s+hơn|dang\s+mua\s+hon/i

export const COMPARE_CLARIFY_MESSAGE =
  'I can’t compare products side by side. Ask about one product (for example “lotus tea”) or browse the Shop.'

const COMPARE_CLARIFY: LangCopy = {
  en: COMPARE_CLARIFY_MESSAGE,
  vi: 'Mình chưa so sánh sản phẩm cạnh nhau được. Hỏi về một sản phẩm (ví dụ “chè sen”) hoặc xem Shop.',
}

const SORT_LABEL: Record<string, LangCopy> = {
  'lowest-priced': { en: 'lowest-priced', vi: 'giá thấp nhất' },
  'highest-priced': { en: 'highest-priced', vi: 'giá cao nhất' },
  // No rating/popularity field in Medusa MVP — honest “featured catalog” wording.
  'top-rated': { en: 'featured', vi: 'nổi bật' },
  featured: { en: 'featured', vi: 'nổi bật' },
  newest: { en: 'newest', vi: 'mới nhất' },
  matching: { en: 'matching', vi: 'phù hợp' },
  ranked: { en: 'ranked', vi: 'đã xếp' },
}

/** Display labels for allowlisted facet values (Ask copy — not NLU). */
const FACET_VALUE_LABEL: Record<ProductFacetKey, Record<string, LangCopy>> = {
  audience: {
    men: { en: 'for men', vi: 'cho nam' },
    women: { en: 'for women', vi: 'cho nữ' },
    unisex: { en: 'unisex', vi: 'unisex' },
    kids: { en: 'for kids', vi: 'cho trẻ em' },
  },
  age_group: {
    kids: { en: 'kids', vi: 'trẻ em' },
    teen: { en: 'teens', vi: 'thiếu niên' },
    adult: { en: 'adults', vi: 'người lớn' },
    senior: { en: 'seniors', vi: 'người lớn tuổi' },
  },
  occasion: {
    birthday: { en: 'for birthdays', vi: 'dịp sinh nhật' },
    tet: { en: 'for Tết', vi: 'dịp Tết' },
    wedding: { en: 'for weddings', vi: 'dịp cưới' },
    daily: { en: 'for everyday', vi: 'hàng ngày' },
    sport: { en: 'for sport', vi: 'thể thao' },
    work: { en: 'for work', vi: 'công việc' },
  },
}

const FEATURED_BROWSE: LangCopy = {
  en: 'Here are a few featured picks. Tell me a product type if you want a tighter match.',
  vi: 'Đây là vài gợi ý nổi bật. Bạn muốn nhóm hàng nào để mình lọc sát hơn?',
}

/** Compact price bound for chat copy (`500000` → `500k` / `500k₫`). */
export function formatAskPriceBound(
  n: number,
  currency: CatalogCurrency = DEFAULT_CATALOG_CURRENCY,
): string {
  if (!Number.isFinite(n)) return String(n)
  const compact = Math.abs(n) >= 1000 && n % 1000 === 0 ? `${n / 1000}k` : String(n)
  if (currency.toUpperCase() === 'VND') return `${compact}₫`
  return compact
}

export function askCopy(
  lang: QueryLanguage,
  key:
    | 'suggested'
    | 'clarify'
    | 'caveat'
    | 'help'
    | 'thanks'
    | 'catalogEmpty'
    | 'filterEmpty'
    | 'promoClarify'
    | 'articlesEmpty'
    | 'orderCountBlocked'
    | 'compare'
    | 'featuredBrowse',
): string {
  switch (key) {
    case 'suggested':
      return pick(lang, SUGGESTED_MATCHES)
    case 'clarify':
      return pick(lang, CLARIFY_QUERY)
    case 'caveat':
      return pick(lang, SUPERLATIVE_CAVEAT)
    case 'help':
      return pick(lang, ASK_HELP)
    case 'thanks':
      return pick(lang, THANKS)
    case 'catalogEmpty':
      return pick(lang, CATALOG_EMPTY)
    case 'filterEmpty':
      return pick(lang, FILTER_EMPTY)
    case 'promoClarify':
      return pick(lang, PROMO_CLARIFY)
    case 'articlesEmpty':
      return pick(lang, ARTICLES_EMPTY)
    case 'orderCountBlocked':
      return pick(lang, ORDER_COUNT_BLOCKED)
    case 'compare':
      return pick(lang, COMPARE_CLARIFY)
    case 'featuredBrowse':
      return pick(lang, FEATURED_BROWSE)
  }
}

export function sortLabelCopy(lang: QueryLanguage, key: string): string {
  return pick(lang, SORT_LABEL[key] ?? SORT_LABEL.ranked!)
}

export function residualNoteCopy(lang: QueryLanguage, residual: string | undefined): string {
  if (!residual) return ''
  return lang === 'vi' ? ` cho “${residual}”` : ` for "${residual}"`
}

export function boundNoteCopy(
  lang: QueryLanguage,
  bound: { priceMin?: number; priceMax?: number },
): string {
  if (bound.priceMax !== undefined) {
    const n = formatAskPriceBound(bound.priceMax)
    return lang === 'vi' ? ` dưới ${n}` : ` under ${n}`
  }
  if (bound.priceMin !== undefined) {
    const n = formatAskPriceBound(bound.priceMin)
    return lang === 'vi' ? ` trên ${n}` : ` over ${n}`
  }
  return ''
}

/** Human phrase for one allowlisted facet value (Ask UI copy only). */
export function facetValueLabel(
  lang: QueryLanguage,
  key: string,
  value: string,
): string | undefined {
  const bag = FACET_VALUE_LABEL[key as ProductFacetKey]
  if (!bag) return undefined
  const row = bag[value]
  if (!row) return undefined
  return pick(lang, row)
}

/**
 * “ for men · for sport” / “ cho nam · thể thao” from MappedPlan.facets.
 * Empty when no facets — callers stay generic.
 */
export function facetNoteCopy(
  lang: QueryLanguage,
  facets: Record<string, string> | undefined,
): string {
  if (!facets) return ''
  const parts: string[] = []
  for (const key of ['audience', 'age_group', 'occasion'] as const) {
    const value = facets[key]
    if (!value) continue
    const label = facetValueLabel(lang, key, value)
    if (label) parts.push(label)
  }
  if (parts.length === 0) return ''
  const joined = parts.join(lang === 'vi' ? ' · ' : ' · ')
  return lang === 'vi' ? ` ${joined}` : ` ${joined}`
}

/** Filter miss when catalog facets/options were requested (ADR-044 — honest empty). */
export function filterEmptyCopy(
  lang: QueryLanguage,
  opts?: {
    facets?: Record<string, string>
    priceMin?: number
    priceMax?: number
    optionColor?: string
    optionSize?: string
  },
): string {
  const facet = facetNoteCopy(lang, opts?.facets)
  const bound = boundNoteCopy(lang, {
    priceMin: opts?.priceMin,
    priceMax: opts?.priceMax,
  })
  const color = opts?.optionColor?.trim()
  const size = opts?.optionSize?.trim()
  const colorNote = color ? (lang === 'vi' ? ` màu ${color}` : ` color ${color}`) : ''
  const sizeNote = size ? (lang === 'vi' ? ` size ${size}` : ` size ${size}`) : ''
  if (!facet && !bound && !colorNote && !sizeNote) return askCopy(lang, 'filterEmpty')

  if (lang === 'vi') {
    return `Hiện không có sản phẩm khớp bộ lọc${facet}${colorNote}${sizeNote}${bound}. Thử tiêu chí khác hoặc xem Shop.`
  }
  return `Nothing in the catalog matches those filters${facet}${colorNote}${sizeNote}${bound} right now. Try different criteria or browse the Shop.`
}

export function productListCopy(
  lang: QueryLanguage,
  opts: {
    count: number
    labelKey: string
    residual?: string
    priceMin?: number
    priceMax?: number
    facets?: Record<string, string>
  },
): string {
  const label = sortLabelCopy(lang, opts.labelKey)
  const residual = residualNoteCopy(lang, opts.residual)
  const bound = boundNoteCopy(lang, { priceMin: opts.priceMin, priceMax: opts.priceMax })
  const facet = facetNoteCopy(lang, opts.facets)
  if (lang === 'vi') {
    if (opts.count === 1) {
      return `Đây là 1 sản phẩm ${label} còn hàng${facet}${residual}${bound}.`
    }
    return `Đây là ${opts.count} sản phẩm ${label} còn hàng${facet}${residual}${bound}.`
  }
  if (opts.count === 1) {
    return `Here is a ${label} in-stock product${facet}${residual}${bound}.`
  }
  return `Here are ${opts.count} ${label} in-stock products${facet}${residual}${bound}.`
}

export function articleListCopy(
  lang: QueryLanguage,
  opts: { count: number; residual?: string; titles: string },
): string {
  const residual = residualNoteCopy(lang, opts.residual)
  if (lang === 'vi') {
    const head =
      opts.count === 1
        ? `Đây là bài viết mới nhất theo ngày đăng${residual}`
        : `Đây là ${opts.count} bài viết mới nhất theo ngày đăng${residual}`
    return `${head}:\n${opts.titles}`
  }
  const head =
    opts.count === 1
      ? `Here is the newest article by publish date${residual}`
      : `Here are the ${opts.count} newest articles by publish date${residual}`
  return `${head}:\n${opts.titles}`
}

export function aggregateCountCopy(
  lang: QueryLanguage,
  opts: {
    count: number
    entity: 'product' | 'article'
    residual?: string
    priceMin?: number
    priceMax?: number
    facets?: Record<string, string>
  },
): string {
  const residual = residualNoteCopy(lang, opts.residual)
  const bound = boundNoteCopy(lang, { priceMin: opts.priceMin, priceMax: opts.priceMax })
  const facet = facetNoteCopy(lang, opts.facets)
  if (lang === 'vi') {
    const noun = opts.entity === 'article' ? 'bài viết' : 'sản phẩm'
    return `Có ${opts.count} ${noun}${facet}${residual}${bound}.`
  }
  const noun =
    opts.entity === 'article'
      ? opts.count === 1
        ? 'article'
        : 'articles'
      : opts.count === 1
        ? 'product'
        : 'products'
  const verb = opts.count === 1 ? 'is' : 'are'
  return `There ${verb} ${opts.count} ${noun}${facet}${residual}${bound}.`
}

export function topMatchCopy(lang: QueryLanguage, title: string): string {
  if (lang === 'vi') {
    return `Kết quả phù hợp nhất: ${title}. Mở để xem chi tiết, hoặc hỏi về giao hàng, đổi trả, thanh toán.`
  }
  return `Top match: ${title}. Open it for details, or ask about shipping, returns, or payment.`
}

/** Lexical HIGH with several product hits — cards already show up to 3. */
export function multiMatchCopy(lang: QueryLanguage, count: number): string {
  if (lang === 'vi') {
    return `Tìm thấy ${count} sản phẩm phù hợp. Mở một sản phẩm để xem chi tiết, hoặc hỏi về giao hàng, đổi trả, thanh toán.`
  }
  return `I found ${count} matching products. Open one for details, or ask about shipping, returns, or payment.`
}

export function lexicalMatchCopy(
  lang: QueryLanguage,
  opts: {
    productTitles: string[]
    fallbackTitle: string
    facets?: Record<string, string>
  },
): string {
  const facet = facetNoteCopy(lang, opts.facets)
  const n = opts.productTitles.length
  if (facet) {
    if (lang === 'vi') {
      if (n >= 2) {
        return `Tìm thấy ${Math.min(n, 3)} sản phẩm phù hợp${facet}. Mở một sản phẩm để xem chi tiết.`
      }
      const title = opts.productTitles[0] ?? opts.fallbackTitle
      return `Kết quả phù hợp nhất${facet}: ${title}. Mở để xem chi tiết.`
    }
    if (n >= 2) {
      return `I found ${Math.min(n, 3)} matching products${facet}. Open one for details.`
    }
    const title = opts.productTitles[0] ?? opts.fallbackTitle
    return `Top match${facet}: ${title}. Open it for details.`
  }
  if (n >= 2) return multiMatchCopy(lang, Math.min(n, 3))
  if (n === 1) return topMatchCopy(lang, opts.productTitles[0]!)
  return topMatchCopy(lang, opts.fallbackTitle)
}

/** Budget / keyword fallback path (`buildChatAnswer`) — keep in sync with CATALOG_EMPTY tone. */
export function budgetChatCopy(
  lang: QueryLanguage,
  opts: { count: number; budget: number | null },
): string {
  if (opts.count === 0) {
    return lang === 'vi'
      ? 'Không tìm thấy sản phẩm còn hàng phù hợp. Thử từ khóa khác hoặc xem Shop.'
      : 'I could not find an in-stock product that matches that request. Try another keyword or browse the Shop.'
  }
  const bound =
    opts.budget === null
      ? ''
      : lang === 'vi'
        ? ` trong ngân sách ${formatAskPriceBound(opts.budget)}`
        : ` within your ${formatAskPriceBound(opts.budget)} budget`
  if (lang === 'vi') {
    return `Tìm thấy ${opts.count} sản phẩm${bound}. Mở một sản phẩm để xem chi tiết.`
  }
  return `I found ${opts.count} product${opts.count === 1 ? '' : 's'}${bound}. Open one to see the full details.`
}
