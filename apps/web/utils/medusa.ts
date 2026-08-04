import type { Product, ProductCategory, ProductOption, ProductVariant } from '~/utils/storefront'
import { FALLBACK_PRODUCT_IMAGE, stripHtml } from '~/utils/storefront'

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
  manage_inventory?: boolean | null
  allow_backorder?: boolean | null
  /** Present when requested via Store API fields (+variants.inventory_quantity). */
  inventory_quantity?: number | null
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
  metadata?: Record<string, unknown> | null
  options?: MedusaOption[]
  variants?: MedusaVariant[]
}

function variantInStock(v: MedusaVariant): boolean {
  // Inventory not managed → always orderable.
  if (!v.manage_inventory) return true
  if (v.allow_backorder) return true
  // When quantity is exposed by the API, respect it; otherwise treat as unavailable.
  if (typeof v.inventory_quantity === 'number') return v.inventory_quantity > 0
  return false
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
    inStock: variantInStock(v),
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
    image: p.thumbnail || gallery[0] || FALLBACK_PRODUCT_IMAGE,
    gallery: gallery.length ? gallery : [p.thumbnail || FALLBACK_PRODUCT_IMAGE],
    title: p.title,
    shortDesc: plain.slice(0, 160) + (plain.length > 160 ? '…' : ''),
    description,
    categoryId: p.categories?.[0]?.id ?? null,
    categoryName: p.categories?.[0]?.name ?? '',
    categoryIds: (p.categories ?? []).map(c => c.id),
    collectionId: p.collection?.id ?? null,
    collectionName: p.collection?.title ?? '',
    inStock: variants.some(v => v.inStock),
    featured: p.metadata?.featured === true || p.metadata?.featured === 'true',
    corporateGift:
      p.metadata?.corporate_gift === true
      || p.metadata?.corporate_gift === 'true'
      || p.metadata?.gift === true
      || p.metadata?.gift === 'true',
    variants,
    options,
    material: p.material ?? null,
    weight: p.weight ?? null,
  }
}
