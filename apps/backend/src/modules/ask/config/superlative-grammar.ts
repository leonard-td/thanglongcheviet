/**
 * Rung-1 superlative grammar markers (EN + VI) — docs/24 §5.1.
 * Data for classifyQueryType; keep EN+VI paired when extending.
 */

export const SUPERLATIVE_MARKERS =
  /nhất|cheapest|priciest|most\s+expensive|least\s+expensive|highest|lowest|newest|oldest|best\s*sell|top-rated|most\s+popular|most\s+read|hot\s*nhất/

export const CONTENT_ENTITY = /bài\s*viết|\b(article|post|blog)\b/

export const PRODUCT_ENTITY = /sản\s*phẩm|\bproduct\b|\bhàng\b|đơn\s*hàng|\border\b/

export const PRICE_ASC =
  /rẻ\s*nhất|rẻ\s*hơn|giá\s*thấp\s*nhất|cheaper|cheapest|lowest\s+price|least\s+expensive|lowest\s+cost|cái\s+rẻ\s+hơn/

/** Vague “what do you sell” / open recommend → catalog browse (not lexical keyword). */
export const CATALOG_BROWSE =
  /^(shop\s+)?bán\s+gì(\s+vậy)?\??$|^có\s+gì\s+bán(\s+vậy)?\??$|^what\s+do\s+you\s+sell\??$|^what(?:'s|\s+is)\s+in\s+(?:the\s+)?(?:shop|store)\??$/i

export const OPEN_RECOMMEND =
  /nên\s+mua\s+gì|nen\s+mua\s+gi|recommend\s+something\s+popular|something\s+popular|gợi\s+ý\s+giúp|goi\s+y\s+giup|phân\s+vân|phan\s+van|chọn\s+giúp|chon\s+giup/i

export const PRICE_DESC = /đắt\s*nhất|giá\s*cao\s*nhất|most\s+expensive|highest\s+price|priciest/

export const POPULAR_PRODUCT =
  /bán\s*chạy(?:\s*nhất)?|được\s*mua\s*nhiều(?:\s*nhất)?|phổ\s*biến(?:\s*nhất)?|(?:sản\s*phẩm|product).*(?:hot|phổ\s*biến|bán\s*chạy)|(?:hot|phổ\s*biến|bán\s*chạy).*(?:sản\s*phẩm|product)|most\s+popular(?:\s+product)?|best\s*sell(?:er|ing|ers)?|top[\s-]*rated|what(?:'s|\s+is|\s+are)?\s+(?:your\s+)?best\s*sellers?|something\s+popular|sản\s*phẩm\s+nào\s+bán\s*chạy/

export const BARE_HOT_PRODUCT =
  /^(cho\s+tôi\s+)?(xem\s+)?(sản\s*phẩm\s+)?hot\s*nhất\??$|^(có\s+gì\s+)?hot(\s+không)?\??$|^recommend\s+something\s+popular\??$/i

export const HOT_CONTENT = /hot|nổi\s*bật|phổ\s*biến|trending|popular|most\s+read|mới\s*nhất/

/** Ambiguous — MED confidence (docs/24 §7). */
export const AMBIGUOUS_TOP =
  /\b(top|best)\s+(gift|product|item)s?\b|sản\s*phẩm\s+(top|best)|top\s+sản\s*phẩm/

/** "cheap" without "cheapest/nhất" — prefer clarify over silent sort. */
export const AMBIGUOUS_CHEAP = /(\bcheap\b(?!\s*est)|giá\s*rẻ(?!\s*nhất)|re\s+tien)/
