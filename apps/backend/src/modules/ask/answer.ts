import type { Answer } from "./answer-types"
import {
  ESCALATE_MESSAGE,
  ESCALATE_MESSAGE_VI,
} from "./config/thresholds"
import { logQueryOutcome } from "./miss-log"
import { askCopy } from "./config/messages"
import { detectLanguage } from "./classifier"
import { getQueryMapper } from "./mapper/get-mapper"
import { executeMappedPlan } from "./mapper/execute-mapped-plan"

/**
 * Ask entry — single control path: QueryMapper → executeMappedPlan.
 * Grounded in FAQ / catalog; no free-form product prose.
 */
export async function answerQuestion(input: {
  q: string
  context?: "product" | "support"
  locale?: "en" | "vi"
  history?: readonly {
    role: "user" | "assistant"
    content: string
    productSlugs?: string[]
  }[]
}): Promise<Answer> {
  const q = input.q.trim()

  if (!q) {
    return {
      kind: "escalated",
      channel: "email",
      message: ESCALATE_MESSAGE_VI,
    }
  }

  const lang = detectLanguage(q, input.locale)
  const mapped = await getQueryMapper().map({
    q,
    locale: input.locale,
    history: input.history,
  })
  const answer = await executeMappedPlan(mapped, input.context ?? "support")

  logQueryOutcome({
    q,
    kind: answer.kind,
    reason: `${mapped.source}:${mapped.route}`,
    lang: mapped.lang || lang,
    confidence: mapped.confidence,
    predictedType: mapped.route,
    executedRoute: "nlu_mapper",
  })

  if (answer.kind === "escalated") {
    // Prefer VI escalate sentinel for VI queries so Nuxt form triggers.
    if (!answer.message.trim()) {
      return {
        kind: "escalated",
        channel: "email",
        message: lang === "vi" ? ESCALATE_MESSAGE_VI : askCopy(lang, "clarify"),
      }
    }
    if (answer.message === ESCALATE_MESSAGE && lang === "vi") {
      return { ...answer, message: ESCALATE_MESSAGE_VI }
    }
  }

  return answer
}
