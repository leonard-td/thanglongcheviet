/** Synonym expand for TLCV tea / gift catalog (VI ↔ EN). */
export const synonyms: Record<string, string[]> = {
  gift: ["present", "hamper", "quà", "qua tang", "quà tặng", "set quà"],
  shipping: ["delivery", "postage", "giao hàng", "giao hang"],
  discount: ["sale", "promo", "voucher", "mã giảm", "ma giam", "coupon"],
  tea: ["chè", "che", "trà", "tra", "trà việt", "tra viet"],
  lotus: ["sen", "gạo sen", "gao sen", "ướp sen"],
  jasmine: ["nhài", "nhai", "hoa nhài", "hoa nhai"],
  pomelo: ["bưởi", "buoi", "hoa bưới", "hoa buoi"],
  coffee: ["cà phê", "ca phe", "càfê", "an quang"],
  corporate: [
    "doanh nghiệp",
    "doanh nghiep",
    "quà doanh nghiệp",
    "qua doanh nghiep",
    "b2b",
    "sỉ",
    // Do not add bare "si" — false-positives on many Latin syllables (e.g. basic).
    "mua sỉ",
    "mua si",
  ],
}

function pushExpandedTerm(extras: string[], term: string): void {
  const t = term.toLowerCase().trim()
  if (!t) return
  if (t.includes(" ")) {
    for (const w of t.split(/\s+/)) {
      if (w.length >= 4) extras.push(w)
    }
    return
  }
  if (t.length >= 2) extras.push(t)
}

function queryHitsAlt(lower: string, tokens: string[], alt: string): boolean {
  const a = alt.toLowerCase()
  if (a.includes(" ")) return lower.includes(a)
  if (a.length <= 3) return tokens.includes(a)
  return lower.includes(a)
}

export function expandQuery(q: string): string {
  const lower = q.trim().toLowerCase()
  if (!lower) return ""
  const tokens = lower.split(/\s+/).filter(Boolean)
  const extras: string[] = []
  for (const [canon, alts] of Object.entries(synonyms)) {
    const hit =
      tokens.includes(canon) ||
      alts.some((alt) => queryHitsAlt(lower, tokens, alt))
    if (!hit) continue
    pushExpandedTerm(extras, canon)
    for (const alt of alts) pushExpandedTerm(extras, alt)
  }
  if (extras.length === 0) return lower
  return `${lower} ${[...new Set(extras)].join(" ")}`.trim()
}
