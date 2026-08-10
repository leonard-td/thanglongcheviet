import type { MedusaContainer } from "@medusajs/framework/types"
import { answerQuestion } from "./answer"
import { loadAskCatalog } from "./catalog-loader"
import {
  setAskCatalog,
  type AskCatalogProduct,
} from "./catalog-context"
import { relatedQuestionsFor } from "./config/related-questions"
import { appendAskMessages, listAskMessages } from "./session-store"
import type { AskChatMessage, AskChatReply, AskProductSuggestion } from "./types"
import {
  ESCALATE_MESSAGE,
  ESCALATE_MESSAGE_EN,
} from "./types"
import type { Answer } from "./answer-types"
import { HIGH_THRESHOLD } from "./config/thresholds"
import { detectLanguage } from "./classifier"

function identifier(prefix: "sess" | "msg"): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

/** Escalate sentinel for chat UI — language matches the user turn. */
function escalateContentFor(q: string): string {
  return detectLanguage(q) === "en" ? ESCALATE_MESSAGE_EN : ESCALATE_MESSAGE
}

function historyFromSession(sessionId?: string) {
  if (!sessionId) return undefined
  return listAskMessages(sessionId)
    .slice(-6)
    .map((m) => ({
      role: m.role,
      content: m.content,
      ...(m.role === "assistant" && m.suggestions?.length
        ? { productSlugs: m.suggestions.map((p) => p.slug) }
        : {}),
    }))
}

function slugFromHref(href: string): string | undefined {
  const m =
    href.match(/\/san-pham\/([^/?#]+)/) || href.match(/\/shop\/([^/?#]+)/)
  return m?.[1]
}

function suggestionsFromAnswer(
  answer: Answer,
  catalog: AskCatalogProduct[],
  userQ: string
): { content: string; suggestions: AskProductSuggestion[] } {
  const bySlug = new Map(catalog.map((p) => [p.slug, p]))
  const escalateFallback = escalateContentFor(userQ)

  const hydrate = (sources: { href: string; title: string }[]) =>
    sources
      .map((s) => {
        const slug = slugFromHref(s.href)
        return slug ? bySlug.get(slug) : undefined
      })
      .filter((p): p is AskCatalogProduct => Boolean(p))
      .slice(0, 3)
      .map(
        (p): AskProductSuggestion => ({
          id: p.id,
          slug: p.slug,
          title: p.title,
          price: p.price,
          currencyCode: p.currencyCode,
          image: p.image,
        })
      )

  if (answer.kind === "escalated") {
    return { content: answer.message, suggestions: [] }
  }

  if (answer.kind === "suggested") {
    const suggestions = hydrate(answer.options)
    if (suggestions.length === 0 || !answer.note.trim()) {
      return { content: escalateFallback, suggestions: [] }
    }
    return { content: answer.note, suggestions }
  }

  // resolved
  const suggestions = hydrate(answer.sources)
  if (suggestions.length > 0) {
    return { content: answer.content, suggestions }
  }

  const isPolicy =
    answer.score >= HIGH_THRESHOLD ||
    (answer.sources.length > 0 &&
      answer.sources.every((s) => !slugFromHref(s.href)))

  if (isPolicy) {
    return { content: answer.content, suggestions: [] }
  }

  return { content: escalateFallback, suggestions: [] }
}

class AskModuleService {
  async sendMessage(
    container: MedusaContainer,
    input: { message: string; sessionId?: string }
  ): Promise<AskChatReply> {
    const content = input.message.trim()
    if (!content) {
      throw new Error("Message is required")
    }

    const sessionId = input.sessionId?.trim() || identifier("sess")
    const createdAt = new Date().toISOString()
    const catalog = await loadAskCatalog(container)
    setAskCatalog(catalog)

    const answer = await answerQuestion({
      q: content,
      context: "support",
      history: historyFromSession(sessionId),
    })

    const { content: assistantContent, suggestions } = suggestionsFromAnswer(
      answer,
      catalog,
      content
    )

    const relatedQuestions = relatedQuestionsFor({
      q: content,
      assistantContent,
      hasProductSuggestions: suggestions.length > 0,
    })

    const userMessage: AskChatMessage = {
      id: identifier("msg"),
      sessionId,
      role: "user",
      content,
      createdAt,
    }

    const assistantMessage: AskChatMessage = {
      id: identifier("msg"),
      sessionId,
      role: "assistant",
      content: assistantContent,
      ...(suggestions.length ? { suggestions } : {}),
      ...(relatedQuestions.length ? { relatedQuestions } : {}),
      createdAt: new Date().toISOString(),
    }

    appendAskMessages(sessionId, [userMessage, assistantMessage])

    return { sessionId, message: assistantMessage }
  }
}

export default AskModuleService
