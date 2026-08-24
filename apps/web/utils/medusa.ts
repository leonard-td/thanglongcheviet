import type { Product, ProductCategory, ProductOption, ProductVariant } from '~/utils/storefront'
import { PLACEHOLDER_IMAGE, stripHtml } from '~/utils/storefront'

export interface MedusaOptionValue {
  value: string
}

export interface MedusaOption {
  id: string
  title: string
  values?: MedusaOptionValue[]
}

export interface MedusaVariantOptionValue {
  value: string
  option?: { title: string }
}

export interface MedusaVariant {
  id: string
  title: string
  calculated_price?: { calculated_amount: number | null, currency_code: string } | null
  options?: MedusaVariantOptionValue[]
}

export interface MedusaCategory {
  id: string
  name: string
  handle: string
  // metadata.related_collection_id: bộ sưu tập gắn với danh mục (đặt trong admin)
  metadata?: Record<string, unknown> | null
}

export interface MedusaCollection {
  id: string
  title: string
  handle: string
  metadata?: Record<string, unknown> | null
}

export interface MedusaProduct {
  id: string
  title: string
  handle: string
  description?: string | null
  thumbnail?: string | null
  material?: string | null
  weight?: number | null
  images?: { url: string }[]
  categories?: MedusaCategory[]
  collection?: MedusaCollection | null
  options?: MedusaOption[]
  variants?: MedusaVariant[]
  // metadata.topic_id: campaign_topic (content_type="product") gắn trong admin
  metadata?: Record<string, unknown> | null
}

export function transformMedusaCategory(c: MedusaCategory): ProductCategory {
  const thumbnail = typeof c.metadata?.thumbnail === 'string' ? c.metadata.thumbnail : null
  return { id: c.id, slug: c.handle, name: c.name, thumbnail }
}

export function transformMedusaProduct(p: MedusaProduct): Product {
  const gallery = (p.images?.map(i => i.url) ?? []).filter(Boolean)
  const description = p.description ?? ''
  const plain = stripHtml(description)

  const variants: ProductVariant[] = (p.variants ?? []).map(v => ({
    id: v.id,
    title: v.title,
    price: v.calculated_price?.calculated_amount ?? 0,
    optionValues: Object.fromEntries(
      (v.options ?? [])
        .filter(o => o.option?.title)
        .map(o => [o.option!.title, o.value]),
    ),
    // Medusa v2 stock levels require a separate inventory-location query —
    // out of scope here, so every listed variant is treated as orderable.
    inStock: true,
  }))
  const firstVariant = variants[0]

  const options: ProductOption[] = (p.options ?? []).map(o => ({
    id: o.id,
    title: o.title,
    values: (o.values ?? []).map(v => v.value),
  }))

  return {
    id: p.id,
    variantId: firstVariant?.id ?? '',
    slug: p.handle,
    price: firstVariant?.price ?? 0,
    currencyCode: p.variants?.[0]?.calculated_price?.currency_code ?? 'vnd',
    image: p.thumbnail || gallery[0] || PLACEHOLDER_IMAGE,
    gallery: gallery.length ? gallery : [p.thumbnail || PLACEHOLDER_IMAGE],
    title: p.title,
    shortDesc: plain.slice(0, 160) + (plain.length > 160 ? '…' : ''),
    description,
    categoryId: p.categories?.[0]?.id ?? null,
    categoryName: p.categories?.[0]?.name ?? '',
    categoryIds: (p.categories ?? []).map(c => c.id),
    collectionId: p.collection?.id ?? null,
    collectionName: p.collection?.title ?? '',
    topicId: typeof p.metadata?.topic_id === 'string' ? p.metadata.topic_id : null,
    inStock: true,
    variants,
    options,
    material: p.material ?? null,
    weight: p.weight ?? null,
  }
}
