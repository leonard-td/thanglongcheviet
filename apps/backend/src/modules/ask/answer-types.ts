export type AnswerSource = { title: string; href: string; snippet?: string }

export type EscalationChannel = "email" | "ticket" | "livechat"

export type Answer =
  | { kind: "resolved"; content: string; sources: AnswerSource[]; score: number }
  | { kind: "suggested"; options: AnswerSource[]; note: string }
  | {
      kind: "escalated"
      ticketId?: string
      channel: EscalationChannel
      message: string
    }

export type AnswerContext = "product" | "support"
