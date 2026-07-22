/**
 * Low-level fetch wrapper for Medusa's Store API. Every request is scoped by
 * the publishable API key + region from runtime config. When a customer is
 * logged in (customer_token cookie), the JWT is attached so carts/orders are
 * associated with that customer and authenticated routes work.
 */
export function useMedusaApi() {
  const config = useRuntimeConfig()
  const isProd = process.env.NODE_ENV === 'production'
  const customerToken = useCookie<string | null>('customer_token', {
    maxAge: 60 * 60 * 24 * 30,
    sameSite: 'lax',
    secure: isProd,
  })

  // SSR inside docker must call the backend via compose DNS, the browser via
  // the published port — see runtimeConfig.medusaBackendUrlServer.
  const baseUrl = import.meta.server && (config as { medusaBackendUrlServer?: string }).medusaBackendUrlServer
    ? (config as { medusaBackendUrlServer?: string }).medusaBackendUrlServer
    : config.public.medusaBackendUrl

  const fetchMedusa = async <T>(path: string, options: Record<string, unknown> = {}) => {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> | undefined),
      'x-publishable-api-key': config.public.medusaPublishableKey,
    }
    if (customerToken.value) {
      headers.Authorization = `Bearer ${customerToken.value}`
    }

    return $fetch<T>(`${baseUrl}${path}`, {
      ...options,
      headers,
    })
  }

  return {
    fetchMedusa,
    customerToken,
    regionId: config.public.medusaRegionId,
    authBaseUrl: baseUrl,
  }
}
