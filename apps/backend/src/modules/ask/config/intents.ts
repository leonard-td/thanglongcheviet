import { knowledgeBase, matchKnowledgeEntry } from './knowledge-base'

export type RetrievalIntent = {
  id: string
  patterns: string[]
  href?: string
  sensitive?: boolean
}

/**
 * Keyword intents — EN + VI patterns (substring, case-insensitive).
 * Derived from the shared Ask knowledge base so policy/sensitive routing cannot drift.
 */

export const intents: RetrievalIntent[] = knowledgeBase.map((entry) => ({
  id: entry.id,
  patterns: entry.patterns,
  href: entry.href,
  sensitive: entry.sensitive,
}))

/** Best matching intent for a query (case-insensitive substring, longest pattern wins). */
export function matchIntent(q: string): RetrievalIntent | undefined {
  const hit = matchKnowledgeEntry(q)
  if (!hit) return undefined
  return intents.find((intent) => intent.id === hit.id)
}
