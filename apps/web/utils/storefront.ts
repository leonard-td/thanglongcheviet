export interface ApiEnvelope<T> {
  success: boolean
  data: T
  meta?: {
    current_page: number
    last_page: number
    total: number
    per_page?: number
  }
  message?: string
}

export interface ProductVariant {
  id: string
  title: string
  price: number
  /** Option title -> selected value for this variant, e.g. { Size: 'M' }. */
  optionValues: Record<string, string>
  inStock: boolean
}

export interface ProductOption {
  id: string
  title: string
  values: string[]
}

export interface Product {
  id: string
  /** Default variant id — required by Medusa's cart line-item API (add to cart). */
  variantId: string
  slug: string
  price: number
  currencyCode: string
  image: string
  gallery: string[]
  title: string
  shortDesc: string
  description: string
  /** Danh mục đầu tiên — dùng để hiển thị (breadcrumb, thông số sản phẩm). */
  categoryId: string | null
  categoryName: string
  /** Toàn bộ danh mục sản phẩm thuộc về — dùng để lọc theo danh mục. */
  categoryIds: string[]
  collectionId: string | null
  collectionName: string
  /** Chủ đề (campaign_topic) gắn qua metadata.topic_id trong admin — dùng để lọc theo chủ đề. */
  topicId: string | null
  inStock: boolean
  variants: ProductVariant[]
  options: ProductOption[]
  material: string | null
  weight: number | null
}

/**
 * Locale/currency-aware money formatting — VND has no decimals, most others
 * use 2. Falls back to a plain "<amount> <CODE>" string if Intl rejects the
 * currency code (e.g. an unrecognized/test code from seed data).
 */
export function formatMoney(amount: number, currencyCode: string, locale = 'vi-VN'): string {
  const code = (currencyCode || 'VND').toUpperCase()
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      maximumFractionDigits: code === 'VND' ? 0 : 2,
    }).format(amount)
  } catch {
    return `${amount.toLocaleString(locale)} ${code}`
  }
}

export interface RawPost {
  id: number
  slug: string
  title: unknown
  short_description?: unknown
  body?: unknown
  image?: string | null
  published_at?: string
  created_at?: string
}

export interface BlogTopic {
  id: string
  name: string
  slug: string
  description: string | null
  image: string | null
  post_count?: number
}

export interface BlogPost {
  slug: string
  title: string
  excerpt: string
  content: string
  image: string
  date: string
  author: string
  topic: { name: string, slug: string } | null
  /** Original source/attribution when the post is adapted from elsewhere, e.g. "Theo VnExpress". */
  source?: string | null
  /** SEO overrides — fall back to title/excerpt/image on the storefront when empty. */
  seoTitle?: string | null
  seoDescription?: string | null
  seoKeywords?: string | null
}

export interface ProductCategory {
  id: string
  slug: string
  name: Record<string, string> | string
  /** Banner đầu trang danh mục — lưu ở metadata.thumbnail (không có field ảnh gốc). */
  thumbnail: string | null
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

export function localText(field: unknown, locale: string): string {
  if (!field) return ''
  if (typeof field === 'string') {
    try {
      const parsed = JSON.parse(field)
      if (typeof parsed === 'object' && parsed !== null) {
        return (parsed as Record<string, string>)[locale] ?? (parsed as Record<string, string>).vi ?? ''
      }
    } catch {
      return field
    }
    return field
  }
  if (typeof field === 'object' && field !== null) {
    const obj = field as Record<string, string>
    return obj[locale] ?? obj.vi ?? ''
  }
  return String(field)
}

export const FALLBACK_PRODUCT_IMAGE = 'https://images.unsplash.com/photo-1594631252845-29fc4cc8c011?q=80&w=800'
export const FALLBACK_POST_IMAGE = 'https://images.unsplash.com/photo-1544787219-7f47ccb7fae6?q=80&w=800'

const cardImageModules = import.meta.glob('~/assets/images/*.jpg', {
  eager: true,
  import: 'default',
}) as Record<string, string>

/**
 * Card images (content.cards, admin "Cards") are either an absolute URL,
 * a backend-relative path (already resolved via useMediaUrl), or a bundled
 * seed asset filename living in ~/assets/images that needs bundler
 * resolution — shared by the products/news mega-menu quick links.
 */
export function resolveCardImage(image: string | null | undefined): string {
  if (!image) return ''
  if (/^https?:\/\//.test(image) || image.startsWith('/')) return image
  return Object.entries(cardImageModules).find(([k]) => k.endsWith(`/${image}`))?.[1] ?? ''
}

export function parseApiError(err: unknown, fallback: string): string {
  if (err && typeof err === 'object') {
    const data = (err as { data?: { message?: string } }).data
    if (data?.message) return data.message
  }
  return fallback
}

export function transformPost(p: RawPost, locale = 'vi'): BlogPost {
  const content = localText(p.body, locale)
  const excerptRaw = localText(p.short_description, locale) || stripHtml(content).slice(0, 200)

  return {
    slug: p.slug,
    title: localText(p.title, locale),
    excerpt: excerptRaw,
    content,
    image: p.image || FALLBACK_POST_IMAGE,
    date: p.published_at || p.created_at || '',
    author: 'Admin',
    topic: null,
  }
}

export function categoryLabel(name: ProductCategory['name'], locale: string): string {
  return localText(name, locale)
}
