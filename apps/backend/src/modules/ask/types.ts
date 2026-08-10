export type AskRole = "user" | "assistant"

/** Compact product card for Ask suggestions (storefront /san-pham/{slug}). */
export type AskProductSuggestion = {
  id: string
  slug: string
  title: string
  price: number
  currencyCode: string
  image: string
}

export type AskChatMessage = {
  id: string
  sessionId: string
  role: AskRole
  content: string
  suggestions?: AskProductSuggestion[]
  relatedQuestions?: string[]
  createdAt: string
}

export type AskChatReply = {
  sessionId: string
  message: AskChatMessage
}

export type AskAnswerKind = "resolved" | "suggested" | "escalated"

export type AskAnswer = {
  kind: AskAnswerKind
  content: string
  suggestions: AskProductSuggestion[]
}

/** Storefront escalate sentinels — single SSOT from config/thresholds. */
export {
  ESCALATE_MESSAGE_VI as ESCALATE_MESSAGE,
  ESCALATE_MESSAGE_EN,
  ESCALATE_MESSAGE_VI,
} from "./config/thresholds"
