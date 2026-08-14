import type { MedusaCategory, MedusaCollection, MedusaProduct } from '~/utils/medusa'
import type { Product } from '~/utils/storefront'
import { transformMedusaCategory, transformMedusaProduct } from '~/utils/medusa'
import { categoryLabel } from '~/utils/storefront'
import { isNotFoundError } from '~/utils/fetch-status'

export interface ProductGroup {
  id: string
  slug: string
  label: string
  /** Banner đầu trang — lưu ở metadata.thumbnail (danh mục/bộ sưu tập không có field ảnh gốc). */
  thumbnail: string | null
  /**
   * metadata.menu_group trên category — admin gắn qua Metadata editor của
   * Medusa như một tag ổn định để tra ra category này bất kể handle đổi tên
   * (vd. an-quang-caffe.vue tìm category "coffee", qua-tang-doanh-nghiep.vue
   * tìm category "gift"). KHÔNG còn được dùng để nhóm tile trong mega-menu
   * sản phẩm — mega-menu (AppHeaderProductsMenu.vue) giờ chỉ vẽ theo children
   * của nav-item "Sản phẩm" trong Admin > Điều hướng, không tự quét category.
   */
  menuGroup: string | null
  /** metadata.menu_group_label — không còn consumer nào đọc field này (trước đây là tiêu đề section trong mega-menu sản phẩm, đã bỏ). Giữ lại trong metadata/type để không phá dữ liệu cũ. */
  menuGroupLabel: string | null
  /**
   * metadata.menu_hidden — không còn consumer nào đọc field này (mega-menu
   * sản phẩm hiện chỉ vẽ theo Điều hướng, không quét category nữa nên không
   * cần cờ ẩn riêng). Giữ lại trong metadata/type để không phá dữ liệu cũ.
   */
  menuHidden: boolean
}

const PRODUCT_FIELDS = 'id,title,handle,description,thumbnail,material,weight,metadata,*images,*categories,'
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
      const menuGroup = typeof c.metadata?.menu_group === 'string' ? c.metadata.menu_group : null
      const menuGroupLabel = typeof c.metadata?.menu_group_label === 'string' ? c.metadata.menu_group_label : null
      const menuHidden = c.metadata?.menu_hidden === true
      return { id: cat.id, slug: cat.slug, label: categoryLabel(cat.name, locale.value), thumbnail: cat.thumbnail, menuGroup, menuGroupLabel, menuHidden }
    }),
  )

  const { data: collectionsData } = useAsyncData(
    'medusa-collections',
    () => fetchMedusa<{ collections: MedusaCollection[] }>('/store/collections?limit=100&fields=id,title,handle,metadata'),
    { default: () => ({ collections: [] as MedusaCollection[] }) },
  )

  const collections = computed<ProductGroup[]>(() =>
    (collectionsData.value?.collections ?? []).map(c => ({
      id: c.id,
      slug: c.handle,
      label: categoryLabel(c.title, locale.value),
      thumbnail: typeof c.metadata?.thumbnail === 'string' ? c.metadata.thumbnail : null,
      menuGroup: null,
      menuGroupLabel: null,
      menuHidden: false,
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
        // Do not block SSR on the parallel catalog fetch (can hang nginx → 504).
        // Related items populate when the catalog is already ready.
        const relatedFromApi = productsAsync.pending.value
          ? ([] as Product[])
          : related(product)
        return { product, relatedFromApi }
      }
      return { product: null, relatedFromApi: [] as Product[] }
    } catch (e) {
      // Empty handle result is not found (null). Network/SSR failures rethrow
      // so reload does not become a false fatal 404.
      if (isNotFoundError(e)) {
        return { product: null, relatedFromApi: [] as Product[] }
      }
      throw e
    }
  }

  /**
   * Products sharing the current product's category or collection. When
   * neither yields a match, fall back to 5–10 random picks from the whole
   * catalog so the section never renders empty on a lonely product.
   */
  const related = (product: Pick<Product, 'slug' | 'categoryIds' | 'collectionId'>, count = 6) => {
    const others = products.value.filter(p => p.slug !== product.slug)
    const pool = others.filter(p =>
      product.categoryIds.some(id => p.categoryIds.includes(id))
      || (product.collectionId && p.collectionId === product.collectionId),
    )
    if (pool.length) return pool.slice(0, count)

    const shuffled = [...others].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, 8)
  }

  const byCategory = (categoryId: string | null) => {
    if (!categoryId) return products.value
    return products.value.filter(p => p.categoryIds.includes(categoryId))
  }

  const byCollection = (collectionId: string | null) => {
    if (!collectionId) return products.value
    return products.value.filter(p => p.collectionId === collectionId)
  }

  const byTopic = (topicId: string | null) => {
    if (!topicId) return []
    return products.value.filter(p => p.topicId === topicId)
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
    byTopic,
    relatedCollectionIdByCategory,
  }
}
