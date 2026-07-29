/**
 * Low-level fetch wrapper for Medusa's Store API. Every request is scoped by
 * the publishable API key + region from runtime config. When a customer is
 * logged in (customer_token cookie), the JWT is attached so carts/orders are
 * associated with that customer and authenticated routes work.
 */
import { getFetchMessage, getFetchStatus, isPublishableKeyError } from '~/utils/fetch-status'

export function useMedusaApi() {
  const config = useRuntimeConfig()
  const customerToken = useCookie<string | null>('customer_token', {
    maxAge: 60 * 60 * 24 * 30,
  })

  // SSR inside docker must call the backend via compose DNS, the browser via
  // the published port — see runtimeConfig.medusaBackendUrlServer.
  const baseUrl = import.meta.server && (config as any).medusaBackendUrlServer
    ? (config as any).medusaBackendUrlServer
    : config.public.medusaBackendUrl

  const publishableKey = String(config.public.medusaPublishableKey || '')

  if (import.meta.dev && !publishableKey) {
    console.warn(
      '[medusa] NUXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY is empty — Store API calls will return 400. '
      + 'Run: node scripts/setup-web-integration.mjs then recreate the web container.',
    )
  }

  const fetchMedusa = async <T>(path: string, options: Record<string, unknown> = {}) => {
    if (!publishableKey) {
      const err = Object.assign(
        new Error('Publishable API key required in the request header: x-publishable-api-key'),
        {
          statusCode: 400,
          data: {
            type: 'not_allowed',
            message: 'Publishable API key required in the request header: x-publishable-api-key',
          },
        },
      )
      throw err
    }

    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> | undefined),
      'x-publishable-api-key': publishableKey,
    }
    if (customerToken.value) {
      headers.Authorization = `Bearer ${customerToken.value}`
    }

    try {
      return await $fetch<T>(`${baseUrl}${path}`, {
        ...options,
        headers,
      })
    }
    catch (error) {
      if (import.meta.dev) {
        const status = getFetchStatus(error)
        const message = getFetchMessage(error)
        console.warn(
          `[medusa] ${options.method || 'GET'} ${path} → ${status ?? '?'}`,
          message || error,
          isPublishableKeyError(error)
            ? '(publishable key missing/invalid — re-run setup-web-integration.mjs)'
            : '',
        )
      }
      throw error
    }
  }

  return {
    fetchMedusa,
    customerToken,
    regionId: config.public.medusaRegionId,
  }
}
