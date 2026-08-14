<script setup lang="ts">
const { t } = useI18n()
const { categories, byCategory, pending } = useProducts()

// Backed by the real "Cà phê" Medusa category (tagged metadata.menu_group =
// "coffee" by sync-menu-categories.ts, same convention as
// qua-tang-doanh-nghiep.vue's gift category lookup) instead of a static
// Coming Soon placeholder — once an admin adds coffee products under that
// category in Medusa admin, they show up here automatically, no code change.
const coffeeCategory = computed(() =>
  categories.value.find(c => c.menuGroup === 'coffee' || c.slug === 'ca-phe' || c.slug === 'an-quang-caffe') ?? null,
)
const coffeeProducts = computed(() =>
  coffeeCategory.value ? byCategory(coffeeCategory.value.id) : [],
)

useScrollAnimation()

useSeoMeta({
  title: () => t('nav.productsMenu.anQuangCaffe'),
  description: () => t('nav.productsMenu.anQuangCaffe'),
})
</script>

<template>
  <SectionsProductGroupShowcase
    :pending="pending"
    :group-label="t('products.browseCategories')"
    :heading="t('nav.productsMenu.anQuangCaffe')"
    :image="coffeeCategory?.thumbnail"
    :items="[]"
    active-slug=""
    base-path="/san-pham/danh-muc"
    :empty-message="t('products.empty')"
    :products="coffeeProducts"
  />
</template>
