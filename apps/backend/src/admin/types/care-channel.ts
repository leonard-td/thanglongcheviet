export type CareChannelProvider = "telegram" | "zalo_oa"

export type CareChannelConfig = {
  // telegram
  bot_token?: string
  chat_id?: string
  // zalo_oa
  app_id?: string
  secret_key?: string
  oa_id?: string
  access_token?: string
  refresh_token?: string
  token_expires_at?: number
  notify_user_ids?: string[]
}

export type CareChannel = {
  id: string
  name: string
  provider: CareChannelProvider
  notify_orders: boolean
  receive_messages: boolean
  is_active: boolean
  config: CareChannelConfig | null
  webhook_secret: string | null
  created_at?: string
}

export type CareChannelsResponse = {
  care_channels: CareChannel[]
  count: number
  limit: number
  offset: number
}

export type CareChannelResponse = {
  care_channel: CareChannel
}
