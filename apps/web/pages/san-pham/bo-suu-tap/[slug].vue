<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
const { collections, byCollection, pending } = useProducts()

useScrollAnimation()

const slug = computed(() => String(route.params.slug))
const collection = computed(() => collections.value.find(c => c.slug === slug.value) ?? null)
const collectionProducts = computed(() => (collection.value ? byCollection(collection.value.id) : []))

watchEffect(() => {
  if (!pending.value && collections.value.length && !collection.value) {
    throw createError({ statusCode: 404, statusMessage: 'Collection not found', fatal: true })
  }
})

const seoTitle = computed(() => `${collection.value?.label ?? ''} | ${t('products.title')}`)
const seoDescription = computed(() => `${collection.value?.label ?? ''} — ${t('products.subtitle')}`)
const seoImage = computed(() => collectionProducts.value[0]?.image || undefined)
const { toAbsoluteShareImage } = useSeoShareImage()
const shareImage = computed(() => toAbsoluteShareImage(seoImage.value))

useSeoMeta({
  title: () => seoTitle.value,
  description: () => seoDescription.value,
  ogTitle: () => seoTitle.value,
  ogDescription: () => seoDescription.value,
  ogImage: () => shareImage.value,
  ogType: 'website',
  twitterCard: 'summary_large_image',
  twitterTitle: () => seoTitle.value,
  twitterDescription: () => seoDescription.value,
  twitterImage: () => shareImage.value,
})
</script>

<template>
  <SectionsProductGroupShowcase
    :pending="pending"
    :group-label="t('products.browseCollections')"
    :heading="collection?.label ?? ''"
    :image="collection?.thumbnail"
    :items="collections"
    :active-slug="slug"
    base-path="/san-pham/bo-suu-tap"
    :empty-message="t('products.emptyCollection')"
    :products="collectionProducts"
  />
</template>
