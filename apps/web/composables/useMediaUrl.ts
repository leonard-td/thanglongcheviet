/**
 * Backend-hosted uploads (cards, post thumbnails/content, topic banners) are
 * stored as host-independent paths like "/static/xxx.jpg" — this resolves
 * them against the *current* backend origin, so changing
 * NUXT_PUBLIC_MEDUSA_BACKEND_URL later never breaks an already-saved link.
 * Absolute URLs (pasted external images, or rows not yet migrated) and bare
 * filenames (bundled fallback assets resolved elsewhere) pass through as-is.
 */
export function useMediaUrl() {
  const config = useRuntimeConfig()

  const resolveMediaUrl = (url: string | null | undefined): string => {
    if (!url) return ''
    if (url.startsWith('http://') || url.startsWith('https://')) return url
    if (url.startsWith('/')) return `${config.public.medusaBackendUrl}${url}`
    return url
  }

  return { resolveMediaUrl }
}
