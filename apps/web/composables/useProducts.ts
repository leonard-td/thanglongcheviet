import type { MedusaCategory, MedusaCollection, MedusaProduct } from '~/utils/medusa'
import type { Product } from '~/utils/storefront'
import { transformMedusaCategory, transformMedusaProduct } from '~/utils/medusa'
import { categoryLabel } from '~/utils/storefront'

export type { Product } from '~/utils/storefront'

export interface ProductGroup {
  id: string
  slug: string
  label: string
}

const PRODUCT_FIELDS = 'id,title,handle,description,thumbnail,material,weight,*images,*categories,'
  + '*collection,*options,*options.values,*variants,*variants.options,*variants.calculated_price'

export function useProducts() {
  const { locale } = useI18n()
  const { fetchMedusa, regionId } = useMedusaApi()

  const productsAsync = useAsyncData(
    'medusa-products',
    () => fetchMedusa<{ products: MedusaProduct[] }>(
      `/store/products?limit=100&region_id=${regionId}&fields=${PRODUCT_FIELDS}`,
    ),
    { default: () => ({ products: [] as MedusaProduct[] }) },
  )
  const { data: productsData, pending } = productsAsync

  const products = computed<Product[]>(() =>
    (productsData.value?.products ?? []).map(transformMedusaProduct),
  )

  // Medusa has no built-in "featured" flag out of the box — surface the
  // first few products instead. Curate via a real flag (e.g. metadata.featured)
  // once real product data replaces the seeded demo catalog.
  const featuredProducts = computed<Product[]>(() => products.value.slice(0, 6))

  const { data: categoriesData } = useAsyncData(
    'medusa-product-categories',
    () => fetchMedusa<{ product_categories: MedusaCategory[] }>(
      '/store/product-categories?limit=100&fields=id,name,handle,rank,metadata',
    ),
    { default: () => ({ product_categories: [] as MedusaCategory[] }) },
  )

  const categories = computed<ProductGroup[]>(() =>
    (categoriesData.value?.product_categories ?? []).map((c) => {
      const cat = transformMedusaCategory(c)
      return { id: cat.id, slug: cat.slug, label: categoryLabel(cat.name, locale.value) }
    }),
  )

  const { data: collectionsData } = useAsyncData(
    'medusa-collections',
    () => fetchMedusa<{ collections: MedusaCollection[] }>('/store/collections?limit=100'),
    { default: () => ({ collections: [] as MedusaCollection[] }) },
  )

  const collections = computed<ProductGroup[]>(() =>
    (collectionsData.value?.collections ?? []).map(c => ({
      id: c.id,
      slug: c.handle,
      label: categoryLabel(c.title, locale.value),
    })),
  )

  const getBySlug = async (slug: string) => {
    try {
      const res = await fetchMedusa<{ products: MedusaProduct[] }>(
        `/store/products?handle=${encodeURIComponent(slug)}&region_id=${regionId}&fields=${PRODUCT_FIELDS}`,
      )
      const raw = res.products?.[0]
      if (raw) {
        const product = transformMedusaProduct(raw)
        // related() reads the full catalog fetched in parallel — wait for it
        // so a direct hit on a product URL still gets related items.
        await Promise.resolve(productsAsync).catch(() => null)
        return { product, relatedFromApi: related(product) }
      }
    } catch (e) {
      console.error(e)
    }

    return { product: null, relatedFromApi: [] as Product[] }
  }

  /**
   * Products sharing the current product's category or collection. When
   * neither yields a match, fall back to 5–10 random picks from the whole
   * catalog so the section never renders empty on a lonely product.
   */
  const related = (product: Pick<Product, 'slug' | 'categoryId' | 'collectionId'>, count = 6) => {
    const others = products.value.filter(p => p.slug !== product.slug)
    const pool = others.filter(p =>
      (product.categoryId && p.categoryId === product.categoryId)
      || (product.collectionId && p.collectionId === product.collectionId),
    )
    if (pool.length) return pool.slice(0, count)

    const shuffled = [...others].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, 8)
  }

  const byCategory = (categoryId: string | null) => {
    if (!categoryId) return products.value
    return products.value.filter(p => p.categoryId === categoryId)
  }

  const byCollection = (collectionId: string | null) => {
    if (!collectionId) return products.value
    return products.value.filter(p => p.collectionId === collectionId)
  }

  /** Bộ sưu tập gắn với danh mục (admin đặt qua metadata.related_collection_id) */
  const relatedCollectionIdByCategory = (categoryId: string | null) => {
    if (!categoryId) return null
    const raw = (categoriesData.value?.product_categories ?? []).find(c => c.id === categoryId)
    const value = raw?.metadata?.related_collection_id
    return typeof value === 'string' && value ? value : null
  }

  return {
    products,
    featuredProducts,
    categories,
    collections,
    pending,
    getBySlug,
    related,
    byCategory,
    byCollection,
    relatedCollectionIdByCategory,
  }
}
