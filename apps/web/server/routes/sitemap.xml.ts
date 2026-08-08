// Bilingual sitemap: every entry lists both the default-locale (vi, no
// prefix) URL and its `/en` counterpart, matching nuxt.config.ts's i18n
// `pages` map (custom-translated segments) or — for routes with no entry
// there — the same path segments under the `/en` prefix (nuxt-i18n's
// `prefix_except_default` behavior for unmapped pages).
interface UrlPair { vi: string; en: string }

const product = (handle: string): UrlPair => ({ vi: `/san-pham/${handle}`, en: `/products/${handle}` })
const productCategory = (handle: string): UrlPair => ({ vi: `/san-pham/danh-muc/${handle}`, en: `/products/category/${handle}` })
const productCollection = (handle: string): UrlPair => ({ vi: `/san-pham/bo-suu-tap/${handle}`, en: `/products/collection/${handle}` })
const productTopic = (slug: string): UrlPair => ({ vi: `/san-pham/chu-de/${slug}`, en: `/san-pham/chu-de/${slug}` })
const post = (slug: string): UrlPair => ({ vi: `/tin-tuc/${slug}`, en: `/blog/${slug}` })
const postTopic = (slug: string): UrlPair => ({ vi: `/tin-tuc/chu-de/${slug}`, en: `/tin-tuc/chu-de/${slug}` })
const storeEvent = (slug: string): UrlPair => ({ vi: `/trai-nghiem/${slug}`, en: `/events/${slug}` })
const eventTopic = (slug: string): UrlPair => ({ vi: `/trai-nghiem/chu-de/${slug}`, en: `/trai-nghiem/chu-de/${slug}` })

// Real content pages only — utility/private pages (giỏ hàng, tài khoản, tra
// cứu đơn, thanh toán) are deliberately excluded, same reasoning as
// robots.txt not wanting those crawled: no unique indexable content, and a
// cart/account page in search results is not a useful result for anyone.
const STATIC_PAGES: UrlPair[] = [
  { vi: '/', en: '/' },
  { vi: '/gioi-thieu', en: '/gioi-thieu' },
  { vi: '/san-pham-list', en: '/products' },
  { vi: '/tin-tuc', en: '/blog' },
  { vi: '/trai-nghiem', en: '/events' },
  { vi: '/lien-he', en: '/contact' },
  { vi: '/lang-nghe', en: '/craft-village' },
  { vi: '/doi-ngu', en: '/team' },
  { vi: '/dich-vu', en: '/services' },
  { vi: '/gallery', en: '/gallery' },
  { vi: '/qua-tang-doanh-nghiep', en: '/qua-tang-doanh-nghiep' },
]

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  // Derived from the request's own Host/X-Forwarded-Proto so the sitemap is
  // correct for whichever domain crawled it, instead of one fixed domain.
  const baseUrl = getRequestURL(event).origin

  // SSR must reach the backend the same way useMedusaApi() does: compose DNS
  // inside Docker, the public URL otherwise.
  const backendUrl = String(config.medusaBackendUrlServer || config.public.medusaBackendUrl || '').replace(/\/$/, '')
  const publishableKey = String(config.public.medusaPublishableKey || '')
  const regionId = String(config.public.medusaRegionId || '')

  const storeFetch = async <T>(path: string, fallback: T): Promise<T> => {
    if (!backendUrl || !publishableKey) return fallback
    try {
      return await $fetch(`${backendUrl}${path}`, {
        headers: { 'x-publishable-api-key': publishableKey },
      }) as T
    } catch {
      // One source failing (e.g. a module not installed) shouldn't blank the
      // whole sitemap — just omit that resource type.
      return fallback
    }
  }

  const [productsRes, categoriesRes, collectionsRes, postsRes, productTopicsRes, postTopicsRes, eventsRes, eventTopicsRes] = await Promise.all([
    storeFetch<{ products: Array<{ handle: string; updated_at?: string }> }>(
      `/store/products?limit=200&fields=handle,updated_at${regionId ? `&region_id=${regionId}` : ''}`,
      { products: [] },
    ),
    storeFetch<{ product_categories: Array<{ handle: string; updated_at?: string }> }>(
      '/store/product-categories?limit=100&fields=handle,updated_at',
      { product_categories: [] },
    ),
    storeFetch<{ collections: Array<{ handle: string; updated_at?: string }> }>(
      '/store/collections?limit=100&fields=handle,updated_at',
      { collections: [] },
    ),
    storeFetch<{ campaign_posts: Array<{ slug: string; created_at?: string }> }>(
      '/store/campaign-posts?limit=100',
      { campaign_posts: [] },
    ),
    storeFetch<{ campaign_topics: Array<{ slug: string }> }>(
      '/store/campaign-topics?content_type=product',
      { campaign_topics: [] },
    ),
    storeFetch<{ campaign_topics: Array<{ slug: string }> }>(
      '/store/campaign-topics?content_type=post',
      { campaign_topics: [] },
    ),
    storeFetch<{ events: Array<{ slug: string; created_at?: string }> }>(
      '/store/events?limit=50',
      { events: [] },
    ),
    storeFetch<{ campaign_topics: Array<{ slug: string }> }>(
      '/store/campaign-topics?content_type=event',
      { campaign_topics: [] },
    ),
  ])

  const pairs: Array<{ pair: UrlPair; lastmod?: string }> = [
    ...STATIC_PAGES.map(pair => ({ pair })),
    ...productsRes.products.map(p => ({ pair: product(p.handle), lastmod: p.updated_at })),
    ...categoriesRes.product_categories.map(c => ({ pair: productCategory(c.handle), lastmod: c.updated_at })),
    ...collectionsRes.collections.map(c => ({ pair: productCollection(c.handle), lastmod: c.updated_at })),
    ...productTopicsRes.campaign_topics.map(t => ({ pair: productTopic(t.slug) })),
    ...postsRes.campaign_posts.map(p => ({ pair: post(p.slug), lastmod: p.created_at })),
    ...postTopicsRes.campaign_topics.map(t => ({ pair: postTopic(t.slug) })),
    ...eventsRes.events.map(e => ({ pair: storeEvent(e.slug), lastmod: e.created_at })),
    ...eventTopicsRes.campaign_topics.map(t => ({ pair: eventTopic(t.slug) })),
  ]

  const urlEntry = (loc: string, lastmod?: string) => {
    const mod = lastmod ? `\n    <lastmod>${new Date(lastmod).toISOString().split('T')[0]}</lastmod>` : ''
    return `  <url>\n    <loc>${loc}</loc>${mod}\n  </url>`
  }

  const urls = pairs.flatMap(({ pair, lastmod }) => [
    urlEntry(`${baseUrl}${pair.vi}`, lastmod),
    urlEntry(`${baseUrl}/en${pair.en === '/' ? '' : pair.en}`, lastmod),
  ])

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`

  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  return xml
})
