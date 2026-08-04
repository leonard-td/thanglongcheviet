/** Mirrors nuxt.config i18n.pages (prefix_except_default: vi unprefixed, en under /en). */
const STATIC_PAGES: Array<{ vi: string; en: string }> = [
  { vi: '/', en: '/en' },
  { vi: '/san-pham-list', en: '/en/products' },
  { vi: '/tin-tuc', en: '/en/blog' },
  { vi: '/lien-he', en: '/en/contact' },
  { vi: '/lang-nghe', en: '/en/craft-village' },
  { vi: '/doi-ngu', en: '/en/team' },
  { vi: '/dich-vu', en: '/en/services' },
  { vi: '/gallery', en: '/en/gallery' },
  { vi: '/tra-cuu-don', en: '/en/order-tracking' },
  { vi: '/gioi-thieu', en: '/en/about' },
  { vi: '/qua-tang-doanh-nghiep', en: '/en/corporate-gifts' },
  { vi: '/trai-nghiem', en: '/en/events' },
]

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const baseUrl = String(config.public.siteUrl || 'https://thanglongcheviet.vn').replace(/\/$/, '')
  const medusaUrl = String(
    config.medusaBackendUrlServer
    || config.public.medusaBackendUrl
    || 'http://127.0.0.1:9000',
  ).replace(/\/$/, '')
  const publishableKey = String(config.public.medusaPublishableKey || '')

  let products: Array<{ slug: string; updated_at?: string }> = []
  let posts: Array<{ slug: string; updated_at?: string }> = []

  const headers: Record<string, string> = {}
  if (publishableKey) headers['x-publishable-api-key'] = publishableKey

  try {
    const res = await $fetch<{ products: Array<{ handle?: string; updated_at?: string }> }>(
      `${medusaUrl}/store/products?limit=100&fields=handle,updated_at`,
      { headers },
    )
    products = (res.products ?? [])
      .filter(p => p.handle)
      .map(p => ({ slug: p.handle!, updated_at: p.updated_at }))
  } catch {
    // Keep static routes if Store API is unavailable.
  }

  try {
    const res = await $fetch<{ posts?: Array<{ slug?: string; handle?: string; updated_at?: string }> }>(
      `${medusaUrl}/store/campaign-posts?limit=100`,
      { headers },
    )
    posts = (res.posts ?? [])
      .map(p => ({
        slug: p.slug || p.handle || '',
        updated_at: p.updated_at,
      }))
      .filter(p => p.slug)
  } catch {
    // Optional campaign posts endpoint.
  }

  const urlEntry = (loc: string, lastmod?: string) => {
    const mod = lastmod ? `\n    <lastmod>${new Date(lastmod).toISOString().split('T')[0]}</lastmod>` : ''
    return `  <url>\n    <loc>${loc}</loc>${mod}\n  </url>`
  }

  const urls = [
    ...STATIC_PAGES.flatMap(p => [
      urlEntry(`${baseUrl}${p.vi === '/' ? '' : p.vi}`),
      urlEntry(`${baseUrl}${p.en}`),
    ]),
    ...products.flatMap(p => [
      urlEntry(`${baseUrl}/san-pham/${p.slug}`, p.updated_at),
      urlEntry(`${baseUrl}/en/products/${p.slug}`, p.updated_at),
    ]),
    ...posts.flatMap(p => [
      urlEntry(`${baseUrl}/tin-tuc/${p.slug}`, p.updated_at),
      urlEntry(`${baseUrl}/en/blog/${p.slug}`, p.updated_at),
    ]),
  ]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`

  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=3600')
  return xml
})
