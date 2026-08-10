import type { QueryLanguage } from '../classifier'
import {
  knowledgeBase,
  matchKnowledgeEntry,
  type KnowledgeEntry,
} from './knowledge-base'

export type FaqSnippet = Required<
  Pick<KnowledgeEntry, 'id' | 'patterns' | 'question' | 'answer' | 'href'>
> &
  Pick<KnowledgeEntry, 'answerVi'>

/**
 * SSOT for policy answers — used by FAQ page retrieval and answerQuestion().
 * Keep href anchors in sync with src/app/(public)/faq/page.tsx ids.
 * UI FAQ page stays English (AP-29); Ask may return answerVi for VI queries.
 */
export const faqSnippets: FaqSnippet[] = knowledgeBase
  .filter(
    (
      entry,
    ): entry is KnowledgeEntry & {
      question: string
      answer: string
      href: string
    } => Boolean(entry.question && entry.answer && entry.href),
  )
  .map((entry) => ({
    id: entry.id,
    patterns: entry.patterns,
    question: entry.question,
    answer: entry.answer,
    answerVi: entry.answerVi,
    href: entry.href,
  }))

export function faqAnswerForLang(snippet: FaqSnippet, lang: QueryLanguage): string {
  if (lang === 'vi' && snippet.answerVi?.trim()) return snippet.answerVi
  return snippet.answer
}

/** Match FAQ snippet by keyword patterns — longest matching pattern wins. */
export function matchFaqSnippet(q: string): FaqSnippet | undefined {
  const hit = matchKnowledgeEntry(q, { requireAnswer: true })
  if (!hit?.answer || !hit.question || !hit.href) return undefined
  return faqSnippets.find((snippet) => snippet.id === hit.id)
}
