import { parseApiError } from '~/utils/storefront'
import type { AskChatReply } from '~/utils/ask'

/**
 * Ask Messages — grounded FAQ + catalog assistant via Medusa Store API
 * (POST /store/ask, POST /store/ask/escalate). Not the admin care-messages inbox.
 */
export function useAsk() {
  const { fetchMedusa } = useMedusaApi()
  const { t } = useI18n()

  const sendMessage = async (input: {
    message: string
    sessionId?: string
  }): Promise<AskChatReply> => {
    try {
      return await fetchMedusa<AskChatReply>('/store/ask', {
        method: 'POST',
        body: {
          message: input.message,
          sessionId: input.sessionId,
        },
      })
    }
    catch (err) {
      throw new Error(parseApiError(err, t('ask.ui.error')))
    }
  }

  const escalate = async (input: {
    q: string
    email?: string
    phone?: string
    name?: string
  }) => {
    try {
      const res = await fetchMedusa<{
        success: boolean
        inquiry_id: string
        message: string
      }>('/store/ask/escalate', {
        method: 'POST',
        body: {
          q: input.q,
          email: input.email || undefined,
          phone: input.phone || undefined,
          name: input.name || undefined,
        },
      })
      if (res.success) {
        return { success: true as const, message: t('ask.escalate.success') }
      }
    }
    catch (err) {
      return {
        success: false as const,
        message: parseApiError(err, t('ask.escalate.error')),
      }
    }
    return { success: false as const, message: t('ask.escalate.error') }
  }

  return { sendMessage, escalate }
}
