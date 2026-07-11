import type { CareChannelProvider } from "./care-channel"

export type CareMessageDirection = "inbound" | "outbound"
export type CareMessageKind = "order" | "support" | "test"
export type CareMessageStatus = "sent" | "failed" | "received"

export type CareMessage = {
  id: string
  channel_id: string
  direction: CareMessageDirection
  kind: CareMessageKind
  external_user_id: string | null
  external_user_name: string | null
  external_message_id: string | null
  content: string
  status: CareMessageStatus
  error: string | null
  created_at?: string
  channel?: {
    id: string
    name: string
    provider: CareChannelProvider
  } | null
}

export type CareMessagesResponse = {
  care_messages: CareMessage[]
  count: number
  limit: number
  offset: number
}

export type CareMessageResponse = {
  care_message: CareMessage
}
