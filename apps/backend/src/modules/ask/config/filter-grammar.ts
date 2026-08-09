/**
 * Filter grammar markers (EN + VI) — docs/24 §5.3.
 * Price: under/over/range/soft-approx (khoảng/around) + optional k/nghìn/triệu.
 * In-stock: còn hàng / in stock.
 * Explicit `$`/`usd` or `vnd`/`₫` convert via demo FX when catalog currency differs.
 */

import { getCatalogCurrency } from './commerce'
import { detectAskPriceMarker, normalizeAskPriceToCatalog } from './commerce'
import { extractOptionFilters } from './option-grammar'

export type ExtractedFilters = {
  filters: Array<{ field: string; op: string; value: unknown }>
  priceMin?: number
  priceMax?: number
  inStockOnly?: boolean
  optionSize?: string
  optionColor?: string
}

/** Soft "khoảng / around X" → inclusive band ± this fraction of center. */
export const SOFT_BUDGET_TOLERANCE = 0.3

const AMOUNT = String.raw`\d+(?:[.,]\d+)?\s*(?:k\b|nghìn|nghin|triệu|trieu|tr\b)?`
const CURRENCY_MARKER = String.raw`(?:\$|usd\s*|vnd\s*|₫\s*)?`
const SOFT_APPROX = String.raw`(?:khoảng|khoang|around|about|approx(?:imately)?|near|xấp\s*xỉ|xap\s*xi|gần)`

/** Parse "500k" / "500.000" / "1 triệu" / "50" → number. k|nghìn → ×1000; triệu → ×1e6. */
export function parseAmountToken(raw: string): number | undefined {
  const t = raw.trim().toLowerCase().replace(/,/g, '')
  const trieu = t.match(/^(\d+(?:[.,]\d+)?)\s*(?:triệu|trieu|tr)$/)
  if (trieu?.[1]) {
    const n = Number.parseFloat(trieu[1].replace(',', '.'))
    return Number.isFinite(n) ? Math.round(n * 1_000_000) : undefined
  }
  const m = t.match(/^(\d+(?:\.\d+)?)\s*(k|nghìn|nghin)?$/)
  if (!m) return undefined
  const n = Number.parseFloat(m[1]!)
  if (!Number.isFinite(n)) return undefined
  if (m[2]) return Math.round(n * 1000)
  // dotted thousands: 500.000
  if (m[1]!.includes('.') && !m[2] && /^\d{1,3}(\.\d{3})+$/.test(raw.trim())) {
    return Number.parseInt(raw.trim().replace(/\./g, ''), 10)
  }
  return Math.round(n)
}

function catalogAmount(markerChunk: string, token: string): number | undefined {
  const v = parseAmountToken(token.replace(/\s+/g, ''))
  if (v === undefined) return undefined
  return normalizeAskPriceToCatalog(v, detectAskPriceMarker(markerChunk), getCatalogCurrency())
}

function normalizeRangeTokens(lowRaw: string, highRaw: string): [string, string] {
  let lo = lowRaw.trim()
  const hi = highRaw.trim()
  if (
    /\bk\b|nghìn|nghin|triệu|trieu|tr$/i.test(hi) &&
    !/\bk\b|nghìn|nghin|triệu|trieu|tr$/i.test(lo)
  ) {
    if (/\d\s*k\b/i.test(hi)) lo = `${lo.replace(/\s/g, '')}k`
  }
  return [lo, hi]
}

function parseRangeAmount(marker: string, token: string): number | undefined {
  const trimmed = token.trim()
  if (/triệu|trieu|tr$/i.test(trimmed)) return parseAmountToken(trimmed)
  return catalogAmount(marker, trimmed)
}

export function extractFilters(s: string): ExtractedFilters {
  const filters: ExtractedFilters['filters'] = []
  let priceMin: number | undefined
  let priceMax: number | undefined
  let inStockOnly: boolean | undefined

  // Range: 200–800k, 200-800k, từ 200k đến 800k, from 50 to 100
  const range =
    s.match(
      new RegExp(
        String.raw`(?:từ|from)\s*(${CURRENCY_MARKER})(${AMOUNT})\s*(?:đến|den|to|-|–)\s*(${CURRENCY_MARKER})(${AMOUNT})`,
        'i',
      ),
    ) ?? s.match(new RegExp(String.raw`(${AMOUNT})\s*(?:-|–)\s*(${AMOUNT})`, 'i'))
  if (range) {
    const lowRaw = range[2] ?? range[1]
    const highRaw = range[4] ?? range[2]
    const markerLow = range[1] ?? ''
    const markerHigh = range[3] ?? markerLow
    if (lowRaw && highRaw) {
      const [loToken, hiToken] = normalizeRangeTokens(lowRaw, highRaw)
      const lo = parseRangeAmount(markerLow, loToken)
      const hi = parseRangeAmount(markerHigh, hiToken)
      if (lo !== undefined && hi !== undefined) {
        priceMin = lo
        priceMax = hi
        filters.push({ field: 'price', op: '>=', value: lo })
        filters.push({ field: 'price', op: '<=', value: hi })
      }
    }
  }

  if (priceMin === undefined && priceMax === undefined) {
    const under = s.match(
      new RegExp(
        String.raw`(?:under|below|dưới|duoi|less\s+than|up\s+to|max(?:imum)?|giá\s*dưới)\s*(${CURRENCY_MARKER})(${AMOUNT})`,
        'i',
      ),
    )
    if (under?.[2]) {
      const v = catalogAmount(under[1] ?? '', under[2])
      if (v !== undefined) {
        priceMax = v
        filters.push({ field: 'price', op: '<', value: v })
      }
    }

    const over = s.match(
      new RegExp(
        String.raw`(?:over|above|trên|tren|more\s+than|giá\s*trên)\s*(${CURRENCY_MARKER})(${AMOUNT})`,
        'i',
      ),
    )
    if (over?.[2]) {
      const v = catalogAmount(over[1] ?? '', over[2])
      if (v !== undefined) {
        priceMin = v
        filters.push({ field: 'price', op: '>', value: v })
      }
    }
  }

  // Soft approx: "khoảng 300k" / "around 50" → band, not unbounded lexical browse.
  if (priceMin === undefined && priceMax === undefined) {
    const soft = s.match(
      new RegExp(String.raw`${SOFT_APPROX}\s*(${CURRENCY_MARKER})(${AMOUNT})`, 'i'),
    )
    if (soft?.[2]) {
      const center = catalogAmount(soft[1] ?? '', soft[2])
      if (center !== undefined && center > 0) {
        const lo = Math.max(0, Math.round(center * (1 - SOFT_BUDGET_TOLERANCE)))
        const hi = Math.round(center * (1 + SOFT_BUDGET_TOLERANCE))
        priceMin = lo
        priceMax = hi
        filters.push({ field: 'price', op: '>=', value: lo })
        filters.push({ field: 'price', op: '<=', value: hi })
      }
    }
  }

  if (/\bin\s*-?\s*stock\b|còn\s*hàng|con\s*hang/.test(s)) {
    inStockOnly = true
    filters.push({ field: 'in_stock', op: '=', value: true })
  }

  const opts = extractOptionFilters(s)

  return {
    filters,
    priceMin,
    priceMax,
    inStockOnly,
    optionSize: opts.size,
    optionColor: opts.color,
  }
}

/** True when query has a structured price/stock/option constraint. */
export function hasStructuredFilter(extracted: ExtractedFilters): boolean {
  return (
    extracted.filters.length > 0 ||
    extracted.inStockOnly === true ||
    Boolean(extracted.optionSize || extracted.optionColor)
  )
}
