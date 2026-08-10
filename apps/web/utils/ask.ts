export type AskRole = 'user' | 'assistant'

export interface AskProductSuggestion {
  id: string
  slug: string
  title: string
  price: number
  currencyCode: string
  image: string
}

export interface AskChatMessage {
  id: string
  sessionId: string
  role: AskRole
  content: string
  suggestions?: AskProductSuggestion[]
  relatedQuestions?: string[]
  createdAt: string
}

export interface AskChatReply {
  sessionId: string
  message: AskChatMessage
}

/** Must match backend ESCALATE_MESSAGE / ESCALATE_MESSAGE_EN. */
export const ASK_ESCALATE_VI =
  'Chúng tôi chưa tìm thấy câu trả lời phù hợp. Để lại thông tin liên hệ, đội ngũ sẽ phản hồi sớm.'

export const ASK_ESCALATE_EN =
  "We couldn't find a confident answer. Leave your contact details and our team will reply."

export function isAskEscalateContent(content: string): boolean {
  return content === ASK_ESCALATE_VI || content === ASK_ESCALATE_EN
}
