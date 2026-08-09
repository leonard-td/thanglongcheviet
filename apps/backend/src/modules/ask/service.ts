import {
  ContainerRegistrationKeys,
  Modules,
  QueryContext,
} from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import { answerQuestion } from "./answer"
import {
  setAskCatalog,
  toAskCatalogProduct,
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

function mapRawProducts(
  products: Array<Record<string, unknown>>,
  currencyCode: string
): AskCatalogProduct[] {
  return products.map((p) => {
    const variants = (p.variants as Array<Record<string, unknown>>) ?? []
    const first = variants[0]
    const calc = first?.calculated_price as
      | { calculated_amount?: number | null; currency_code?: string }
      | undefined
    const images = (p.images as Array<{ url?: string }>) ?? []
    const categories = (p.categories as Array<{ name?: string }>) ?? []
    const optionsRaw =
      (p.options as Array<{
        title?: string
        values?: Array<{ value?: string }>
      }>) ?? []
    const options: Array<{ name: string; value: string }> = []
    for (const opt of optionsRaw) {
      const name = opt.title ?? ""
      for (const v of opt.values ?? []) {
        if (name && v.value) options.push({ name, value: v.value })
      }
    }

    return toAskCatalogProduct({
      id: String(p.id),
      title: String(p.title ?? ""),
      handle: String(p.handle ?? ""),
      description: (p.description as string | null) ?? null,
      thumbnail: (p.thumbnail as string | null) ?? null,
      imageUrl: images[0]?.url ?? null,
      categoryNames: categories.map((c) => c.name ?? "").filter(Boolean),
      price: Number(calc?.calculated_amount ?? 0),
      currencyCode: (calc?.currency_code || currencyCode).toLowerCase(),
      options,
    })
  })
}

async function loadCatalog(
  container: MedusaContainer
): Promise<AskCatalogProduct[]> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const regionModule = container.resolve(Modules.REGION)
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  const regions = await regionModule.listRegions({}, { take: 1 })
  const region = regions[0]
  const currencyCode = (
    region?.currency_code ||
    process.env.ASK_CURRENCY_CODE ||
    "vnd"
  ).toLowerCase()

  const baseFields = [
    "id",
    "title",
    "handle",
    "description",
    "thumbnail",
    "status",
    "images.url",
    "categories.name",
    "options.title",
    "options.values.value",
    "variants.id",
  ]

  const pricedFields = [
    ...baseFields,
    "variants.calculated_price.calculated_amount",
    "variants.calculated_price.currency_code",
  ]

  try {
    const graph: Record<string, unknown> = {
      entity: "product",
      fields: pricedFields,
      filters: { status: "published" },
    }

    if (region?.id) {
      graph.context = {
        variants: {
          calculated_price: QueryContext({
            region_id: region.id,
            currency_code: currencyCode,
          }),
        },
      }
    }

    const { data: products } = await query.graph(graph as never)
    return mapRawProducts(
      (products as Array<Record<string, unknown>>) ?? [],
      currencyCode
    )
  } catch (error) {
    logger.warn(
      `ask: priced catalog query failed, falling back without prices: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
    const { data: products } = await query.graph({
      entity: "product",
      fields: baseFields,
      filters: { status: "published" },
    } as never)
    return mapRawProducts(
      (products as Array<Record<string, unknown>>) ?? [],
      currencyCode
    )
  }
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
    const catalog = await loadCatalog(container)
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
