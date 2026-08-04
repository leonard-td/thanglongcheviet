import { REDACTED_SECRET } from "../../../lib/care-channel-secrets"

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

export { REDACTED_SECRET, isRedactedSecret } from "../../../lib/care-channel-secrets"

/** Strip secrets from admin API responses (list + detail). */
export function redactCareChannel<T extends CareChannelLike>(channel: T): T {
  const config = { ...((channel.config as Record<string, unknown>) ?? {}) }
  for (const key of SECRET_CONFIG_KEYS) {
    if (config[key]) {
      config[key] = REDACTED_SECRET
    }
  }
  return {
    ...channel,
    config,
    webhook_secret: channel.webhook_secret ? REDACTED_SECRET : null,
  }
}
