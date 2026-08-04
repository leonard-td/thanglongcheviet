type CareChannelLike = {
  config?: Record<string, unknown> | null
  webhook_secret?: string | null
  [key: string]: unknown
}

const SECRET_CONFIG_KEYS = [
  "bot_token",
  "secret_key",
  "access_token",
  "refresh_token",
] as const

/** Strip secrets from list responses; detail pages still return full credentials for editing. */
export function redactCareChannel<T extends CareChannelLike>(channel: T): T {
  const config = { ...((channel.config as Record<string, unknown>) ?? {}) }
  for (const key of SECRET_CONFIG_KEYS) {
    if (config[key]) {
      config[key] = "••••••••"
    }
  }
  return {
    ...channel,
    config,
    webhook_secret: channel.webhook_secret ? "••••••••" : null,
  }
}
