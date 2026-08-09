/**
 * Strip structured operator tokens; leftover free-text = lexical residue (docs/24 §6).
 * Keyword match only — not hybrid re-rank.
 * Note: JS `\b` is ASCII-word only — do not use it around Vietnamese tokens.
 *
 * Gift synonyms + recipient words are browse intent (price/sort only), not catalog keywords —
 * mock/live catalogs rarely title SKUs "gift for mom".
 */

const KNOWN_PRODUCT_NOUNS: Record<string, string[]> = {
  chè: ['chè', 'che', 'trà', 'tra', 'tea', 'trà việt', 'tra viet'],
  'chè tôm': ['chè tôm', 'che tom', 'tôm'],
  sen: ['sen', 'gạo sen', 'gao sen', 'ướp sen', 'uop sen', 'lotus'],
  nhài: ['nhài', 'nhai', 'hoa nhài', 'hoa nhai', 'jasmine'],
  bưởi: ['bưởi', 'buoi', 'hoa bưởi', 'hoa buoi', 'pomelo'],
  'mộc hương': ['mộc hương', 'moc huong', 'hoa mộc', 'osmanthus'],
  'cà phê': ['cà phê', 'ca phe', 'coffee', 'ân quang', 'an quang'],
  quà: ['quà', 'qua', 'quà tặng', 'qua tang', 'set quà', 'hộp quà', 'hop qua', 'gift'],
  'doanh nghiệp': ['doanh nghiệp', 'doanh nghiep', 'corporate', 'b2b'],
}

function termHit(lower: string, term: string): boolean {
  const t = term.toLowerCase()
  if (t.includes(' ')) return lower.includes(t)
  const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'u').test(lower)
}

/**
 * Return catalog-friendly surface terms found in the query (VI/EN as typed),
 * not English-only canonical keys — Medusa titles are Vietnamese.
 */
export function extractKnownProductTerms(raw: string): string[] {
  const lower = raw.trim().toLowerCase()
  if (!lower) return []
  const hits: string[] = []
  for (const [canonical, alts] of Object.entries(KNOWN_PRODUCT_NOUNS)) {
    const terms = [canonical, ...alts].sort((a, b) => b.length - a.length)
    const matched = terms.find((term) => termHit(lower, term))
    if (matched) {
      hits.push(matched)
    }
  }
  // Drop shorter hits covered by a longer phrase (e.g. chè ⊂ chè tôm).
  const uniq = [...new Set(hits)].sort((a, b) => b.length - a.length)
  return uniq.filter(
    (term, i) => !uniq.some((other, j) => j < i && other.includes(term))
  )
}

const STRIP_PATTERNS: RegExp[] = [
  /rẻ\s*nhất|rẻ\s*hơn|giá\s*thấp\s*nhất|cheapest|cheaper|lowest\s+price|least\s+expensive|lowest\s+cost/gi,
  /đắt\s*nhất|giá\s*cao\s*nhất|most\s+expensive|highest\s+price|priciest/gi,
  /most\s+popular|best\s*sell(?:er|ing|ers)?|hot\s*nhất|phổ\s*biến|bán\s*chạy|được\s*mua\s*nhiều|nổi\s*bật|trending|most\s+read|mới\s*nhất|bestsellers?/gi,
  /(?:under|below|dưới|duoi|less\s+than|up\s+to|max(?:imum)?|giá\s*dưới)\s*(?:\$|usd\s*|vnd\s*|₫\s*)?\d+(?:[.,]\d+)?\s*(?:k|nghìn|nghin|triệu|trieu|tr)?/gi,
  /(?:over|above|trên|tren|more\s+than|giá\s*trên)\s*(?:\$|usd\s*|vnd\s*|₫\s*)?\d+(?:[.,]\d+)?\s*(?:k|nghìn|nghin|triệu|trieu|tr)?/gi,
  /(?:khoảng|khoang|around|about|approx(?:imately)?|near|xấp\s*xỉ|xap\s*xi|gần)\s*(?:\$|usd\s*|vnd\s*|₫\s*)?\d+(?:[.,]\d+)?\s*(?:k|nghìn|nghin|triệu|trieu|tr)?/gi,
  /\bin\s*-?\s*stock\b|còn\s*hàng|con\s*hang/gi,
  /\btop\b|\bhottest\b|\bbest\b/gi,
  /\bcheap(?:est)?\b|giá\s*rẻ|re\s+tien/gi,
  // Conversational wrappers — must not become compound keywords (user: “tôi muốn hỏi về …”).
  /(?:^|\s)(?:tôi|mình|em|anh|chị)\s+(?:muốn|cần)(?:\s+(?:hỏi|biết|tìm)(?:\s+về)?)?(?=\s|$)/gi,
  /(?:^|\s)(?:muốn\s+hỏi(?:\s+về)?|hỏi\s+về|cho\s+(?:tôi|mình|em)|giúp\s+(?:tôi|mình)(?:\s+với)?|giúp\s+tôi\s+tìm|tư\s*vấn(?:\s+giúp)?|làm\s+ơn(?:\s+cho\s+xem)?|có\s+thể\s+cho\s+tôi\s+biết\s+về|xin\s+hỏi(?:\s+về)?|cho\s+hỏi(?:\s+về)?)(?=\s|$)/gi,
  /i\s+want\s+to\s+(?:ask\s+about|know\s+about|see|find|buy)|i(?:'m| am)\s+looking\s+for|tell\s+me\s+about|can\s+you\s+(?:show|recommend)|could\s+you\s+recommend|help\s+me\s+find|please\s+(?:recommend|show)|what\s+(?:are|is)\s+(?:the|your)?|recommend\s+something/gi,
  /(?:^|\s)(?:shop\s*ơi|nào|gì)(?=\s|$)/gi,
  /(?:^|\s)(?:bài\s*viết|articles?|posts?|blogs?)(?=\s|$)/gi,
  // Soft product-entity phrases — strip before leftover syllables become keywords ("mặt").
  /mặt\s*hàng|mat\s*hang|hàng\s*hóa|hang\s*hoa/gi,
  /(?:^|\s)(?:sản\s*phẩm|products?|items?|đơn\s*hàng|orders?|hàng)(?=\s|$)/gi,
  // Soft fit / suitability — never a catalog keyword.
  /phù\s*hợp|phu\s*hop|suitable|appropriate|fitting/gi,
  /(?:^|\s)(?:cho\s+tôi|xem|please|show|me|the|a|an|các|những|nhất|vậy|đang|có|không|ko|hong)(?=\s|$)/gi,
  /how\s+many|bao\s+nhiêu|có\s+bao\s+nhiêu|tổng\s+số|count\s+of|total\s+number\s+of|number\s+of/gi,
  /(?:^|\s)(?:recommend(?:ed|ation)?|gợi\s*ý)(?=\s|$)/gi,
  /nên\s+mua\s+gì|hôm\s+nay|phân\s+vân|phan\s+van|chọn\s+giúp\s+\d*\s*món|chon\s+giup/gi,
  // Strip already-structured option phrases after plan extract (not Ask quality SoT).
  // Grammar freeze: do not grow color tokens here — product-options + LLM optionFilters.
  /(?:màu|mau|color|colour)\s*[:=]?\s*(?:xanh\s+dương|xanh\s+duong|xanh\s+lá|xanh\s+la|[a-zàáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]+)/gi,
  /\b(?:size|cỡ|co)\s+[mslxl\d]{1,4}\b/gi,
  /(?:kích\s*thước|kich\s*thuoc)\s*[:=]?\s*[mslxl\d]{1,4}/gi,
]

/** Soft browse fillers — keep `quà` searchable (TLCV catalog noun). */
const GIFT_BROWSE = new Set([
  'gift',
  'gifts',
  'present',
  'presents',
  'hamper',
  'hampers',
  'tang',
])

const RECIPIENT_STOP = new Set([
  'mom',
  'dad',
  'mother',
  'father',
  'wife',
  'husband',
  'boyfriend',
  'girlfriend',
  'parent',
  'parents',
  'sister',
  'brother',
  'friend',
  'friends',
  'her',
  'him',
  'them',
  'mẹ',
  'bố',
  'ba',
  'chồng',
  'vợ',
  'bạn',
  // Gender/audience is a catalog facet (tags → attr_facets), not a BM25 stopword —
  // do not put bare "nam"/"nữ" here (breaks Việt Nam; Ask filters via MappedPlan.facets).
])

const STOP = new Set([
  'the',
  'a',
  'an',
  'of',
  'for',
  'with',
  'and',
  'or',
  'to',
  'in',
  'on',
  'is',
  'are',
  'about',
  'ask',
  'want',
  'know',
  'find',
  'buy',
  'looking',
  'của',
  'và',
  'cho',
  'với',
  'là',
  'hàng',
  'đơn',
  'mặt',
  'vậy',
  'then',
  'so',
  'please',
  // Price operator leftovers after strip
  'giá',
  'price',
  'cost',
  // Vague browse fillers (not catalog keywords)
  'something',
  'anything',
  'nice',
  'good',
  'great',
  'some',
  'any',
  'stuff',
  'thing',
  'things',
  'đồ',
  'phù',
  'hợp',
  'suitable',
  'appropriate',
  // VI soft-intent leftovers
  'tôi',
  'mình',
  'em',
  'anh',
  'chị',
  'muốn',
  'hỏi',
  'về',
  'đang',
  'giúp',
  'ạ',
  'nhé',
  'với',
  'cần',
  'ơi',
  'shop',
  'biết',
  'tìm',
  'tư',
  'vấn',
  'làm',
  'ơn',
  'thể',
  'nào',
  'gì',
  'what',
  'your',
  'có',
  'không',
  'ko',
  'hong',
  'bán',
  'cái',
  'cai',
  'nên',
  'hôm',
  'nay',
  'thêm',
  'nữa',
  'nua',
  'phân',
  'vân',
  'van',
  'món',
  'mon',
  'đi',
  'được',
  'duoc',
])

export function extractLexicalResidue(raw: string): string {
  const positive = extractKnownProductTerms(raw)

  let s = ` ${raw.trim().toLowerCase()} `
  for (const re of STRIP_PATTERNS) {
    s = s.replace(re, ' ')
  }

  // Remove known-noun surface forms so leftover tokens keep intent modifiers
  // (e.g. "áo khoác đi phượt trời lạnh" → jacket + "phượt trời lạnh", not "jacket" alone).
  // Global length sort avoids short group terms eating longer phrases of later groups.
  const allTerms = Object.entries(KNOWN_PRODUCT_NOUNS)
    .flatMap(([canonical, alts]) => [canonical, ...alts])
    .sort((a, b) => b.length - a.length)
  for (const term of allTerms) {
    const t = term.toLowerCase()
    if (t.includes(' ')) {
      s = s.split(t).join(' ')
      continue
    }
    const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    s = s.replace(new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'gu'), ' ')
  }

  const leftover = s
    .split(/\s+/)
    .map((t) =>
      t.replace(
        /[^a-z0-9àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ-]/gi,
        '',
      ),
    )
    .filter((t) => t.length > 1 && !STOP.has(t) && !GIFT_BROWSE.has(t) && !RECIPIENT_STOP.has(t))

  if (positive.length > 0) {
    const extra = leftover.filter((t) => !positive.includes(t))
    return [...positive, ...extra].join(' ').trim()
  }

  return leftover.join(' ').trim()
}
