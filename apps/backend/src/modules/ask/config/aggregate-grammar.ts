/**
 * Aggregate grammar (EN + VI) — docs/24 §5.2 thin: count only.
 *
 * Bare "bao nhiêu" is ambiguous (fee vs count) — require count framing.
 * Shipping/fee questions ("phí ship bao nhiêu") must NOT match.
 */
export function isAggregateCount(s: string): boolean {
  if (
    /phí\s*ship|phi\s*ship|shipping\s*fee|shipping\s*cost|phí\s*giao|bao\s*nhiêu\s*tiền/.test(s)
  ) {
    return false
  }
  return (
    /how\s+many|có\s+bao\s+nhiêu|tổng\s+số|count\s+(?:of\s+)?|total\s+number\s+of|number\s+of|bao\s+nhiêu\s+(?:sản\s*phẩm|products?|items?|đơn|orders?|bài)/.test(
      s,
    ) && !/average|trung\s*bình|sum\s+of|tổng\s+tiền/.test(s)
  )
}

export function aggregateEntity(s: string): 'product' | 'order' | 'content' | 'unknown' {
  if (/bài\s*viết|\b(article|post|blog)s?\b/.test(s)) return 'content'
  if (/\border|đơn\s*hàng/.test(s)) return 'order'
  if (/sản\s*phẩm|\bproducts?\b|\bitems?\b|hàng/.test(s)) return 'product'
  return 'product' // default catalog count
}
