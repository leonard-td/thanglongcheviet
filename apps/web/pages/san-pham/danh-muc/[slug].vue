<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
const {
  categories,
  collections,
  byCategory,
  byCollection,
  relatedCollectionIdByCategory,
  pending,
} = useProducts()

useScrollAnimation()

const slug = computed(() => String(route.params.slug))
const category = computed(() => categories.value.find(c => c.slug === slug.value) ?? null)
const categoryProducts = computed(() => (category.value ? byCategory(category.value.id) : []))

// Bộ sưu tập gắn với danh mục (admin đặt qua metadata.related_collection_id):
// sản phẩm của nó hiện ở menu phải tự cuộn.
const relatedCollectionId = computed(() =>
  relatedCollectionIdByCategory(category.value?.id ?? null),
)
const sidebarProducts = computed(() =>
  relatedCollectionId.value ? byCollection(relatedCollectionId.value) : [],
)
const sidebarTitle = computed(() =>
  collections.value.find(c => c.id === relatedCollectionId.value)?.label
  ?? t('products.collectionSidebar'),
)

watchEffect(() => {
  if (!pending.value && categories.value.length && !category.value) {
    throw createError({ statusCode: 404, statusMessage: 'Category not found', fatal: true })
  }
})

const seoTitle = computed(() => `${category.value?.label ?? ''} | ${t('products.title')}`)
const seoDescription = computed(() => `${category.value?.label ?? ''} — ${t('products.subtitle')}`)
const seoImage = computed(() => categoryProducts.value[0]?.image || undefined)

useSeoMeta({
  title: () => seoTitle.value,
  description: () => seoDescription.value,
  ogTitle: () => seoTitle.value,
  ogDescription: () => seoDescription.value,
  ogImage: () => seoImage.value,
  ogType: 'website',
  twitterCard: 'summary_large_image',
  twitterTitle: () => seoTitle.value,
  twitterDescription: () => seoDescription.value,
  twitterImage: () => seoImage.value,
})
</script>

<template>
  <SectionsProductGroupShowcase
    :pending="pending"
    :group-label="t('products.browseCategories')"
    :heading="category?.label ?? ''"
    :image="category?.thumbnail"
    :items="categories"
    :active-slug="slug"
    base-path="/san-pham/danh-muc"
    :empty-message="t('products.empty')"
    :products="categoryProducts"
    :sidebar-products="sidebarProducts"
    :sidebar-title="sidebarTitle"
  />
</template>
