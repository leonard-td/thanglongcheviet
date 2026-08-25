import { absoluteUrl } from '~/utils/storefront'

/**
 * Absolute URLs for og:image / twitter:image and JSON-LD `image` fields.
 * Crawlers (Facebook, Zalo) require fetchable absolute URLs — relative
 * `/static/...` or `/images/...` paths break share previews.
 */
export function useSeoShareImage() {
  const origin = useRequestURL().origin
  const config = useRuntimeConfig()

  const toAbsoluteShareImage = (url: string | null | undefined): string | undefined => {
    if (!url) return undefined
    if (/^https?:\/\//i.test(url)) return url

    const backend = String(config.public.medusaBackendUrl || '').replace(/\/$/, '')
    // Admin uploads are stored as /static/... — in split dev the backend may
    // be on a different port than the Nuxt SSR origin.
    if (url.startsWith('/static/') && backend) {
      return absoluteUrl(backend, url) || undefined
    }

    return absoluteUrl(origin, url) || undefined
  }

  return { toAbsoluteShareImage }
}
