export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  // Derived from the request's own Host/X-Forwarded-Proto so the sitemap is
  // correct for whichever domain crawled it, instead of one fixed domain.
  const baseUrl = getRequestURL(event).origin
  const apiBase = String(config.apiProxyTarget || 'http://127.0.0.1:8000').replace(/\/$/, '')

  const staticPaths = ['/', '/san-pham-list', '/tin-tuc', '/lien-he', '/lang-nghe', '/doi-ngu', '/dich-vu', '/gallery', '/gio-hang', '/tai-khoan', '/tra-cuu-don']

  let products: Array<{ slug: string; updated_at?: string }> = []
  let posts: Array<{ slug: string; updated_at?: string }> = []

  try {
    const res = await $fetch<{ success: boolean; data: { products: typeof products; posts: typeof posts } }>(
      `${apiBase}/api/storefront/sitemap`,
    )
    if (res.success) {
      products = res.data.products ?? []
      posts = res.data.posts ?? []
    }
  } catch {
    // Sitemap still returns static routes if API is unavailable.
  }

  const urlEntry = (loc: string, lastmod?: string) => {
    const mod = lastmod ? `\n    <lastmod>${new Date(lastmod).toISOString().split('T')[0]}</lastmod>` : ''
    return `  <url>\n    <loc>${loc}</loc>${mod}\n  </url>`
  }

  const urls = [
    ...staticPaths.map(path => urlEntry(`${baseUrl}${path}`)),
    ...products.map(p => urlEntry(`${baseUrl}/san-pham/${p.slug}`, p.updated_at)),
    ...posts.map(p => urlEntry(`${baseUrl}/tin-tuc/${p.slug}`, p.updated_at)),
  ]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`

  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  return xml
})
