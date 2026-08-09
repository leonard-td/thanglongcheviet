/**
 * Thin session context for Ask mapper (ADR-042 Phase D).
 * Resolves anaphora — no free-form generation.
 */

import { routes } from "../config/commerce"

export type AskHistoryTurn = {
  role: "user" | "assistant"
  content: string
  productSlugs?: string[]
}

/** Unicode-aware — JS `\b` is ASCII-only and breaks Vietnamese "cái đó". */
const ANAPHORA_RE =
  /(?<![\p{L}\p{N}])(cái\s*đó|cai\s*do|cái\s*này|cai\s*nay|that\s+one|this\s+one)(?![\p{L}\p{N}])/giu

const PROMO_RE = /giảm\s*giá|giam\s*gia|discount|sale|promo|on\s+sale/i

/** Expand query with session slug when user says "cái đó …". */
export function resolveSessionQuery(
  q: string,
  history?: readonly AskHistoryTurn[]
): { q: string; sessionResolved?: boolean } {
  const raw = q.trim()
  if (!history?.length || !ANAPHORA_RE.test(raw)) return { q: raw }
  // reset lastIndex after /g test
  ANAPHORA_RE.lastIndex = 0

  for (let i = history.length - 1; i >= 0; i--) {
    const turn = history[i]
    if (turn?.role !== "assistant") continue
    const slug = turn.productSlugs?.[0]
    if (!slug) continue
    const noun = slug.replace(/-/g, " ")
    const expanded = raw.replace(ANAPHORA_RE, noun)
    ANAPHORA_RE.lastIndex = 0
    return { q: expanded, sessionResolved: true }
  }

  return { q: raw }
}

export function isPromoWithoutEntity(
  q: string,
  history?: readonly AskHistoryTurn[]
): boolean {
  if (!PROMO_RE.test(q)) return false
  ANAPHORA_RE.lastIndex = 0
  if (ANAPHORA_RE.test(q) && history?.some((t) => t.productSlugs?.length)) {
    ANAPHORA_RE.lastIndex = 0
    return false
  }
  ANAPHORA_RE.lastIndex = 0
  const hasProductNoun =
    /(?<![\p{L}\p{N}])(chè|che|trà|tra|quà|qua|sản\s*phẩm|san\s*pham|product|gift|hộp|hop|set)(?![\p{L}\p{N}])/iu.test(
      q
    )
  return !hasProductNoun
}

export function slugsFromSources(sources: { href: string }[]): string[] {
  return sources
    .map((s) => {
      const m =
        s.href.match(/\/san-pham\/([^/?#]+)/) ||
        s.href.match(/\/shop\/([^/?#]+)/)
      return m?.[1]
    })
    .filter((s): s is string => Boolean(s))
}

export function productHref(slug: string): string {
  return routes.product(slug)
}
