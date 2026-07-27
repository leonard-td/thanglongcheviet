<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
const { site } = useSettings()
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

useSeoMeta({
  title: () => `${collection.value?.label ?? ''} | ${t('products.title')} | ${site.value.name}`,
  description: () => `${collection.value?.label ?? ''} — ${t('products.subtitle')}`,
  ogImage: () => collectionProducts.value[0]?.image || undefined,
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
