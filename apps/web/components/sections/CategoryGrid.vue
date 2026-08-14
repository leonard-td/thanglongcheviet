<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const { categories, byCategory } = useProducts()

const tiles = computed(() =>
  categories.value.map((c) => {
    const items = byCategory(c.id)
    return { ...c, image: c.thumbnail ?? items[0]?.image ?? null, count: items.length }
  }),
)
</script>

<template>
  <section v-if="tiles.length" class="section-py bg-dark" aria-labelledby="categories-heading">
    <div class="container-page">
      <div class="text-center mb-10 animate-on-scroll">
        <p class="text-xs uppercase tracking-[0.25em] text-primary-400 mb-2">
          {{ t('products.categoriesTitle') }}
        </p>
        <!-- <h2 id="categories-heading" class="section-heading text-white mb-4">
          {{ t('products.categoriesTitle') }}
        </h2> -->
        <div class="divider-gold" />
        <!-- <p class="section-subheading mt-4 max-w-2xl mx-auto">
          {{ t('products.categoriesSubtitle') }}
        </p> -->
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        <NuxtLink
          v-for="c in tiles"
          :key="c.id"
          :to="localePath(`/san-pham/danh-muc/${c.slug}`)"
          class="group relative block aspect-[4/3] overflow-hidden rounded-2xl
                 ring-1 ring-white/10 hover:ring-primary-400/60
                 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/30
                 transition-all duration-300 animate-on-scroll"
          :aria-label="c.label"
        >
          <img
            v-if="c.image"
            :src="c.image"
            :alt="c.label"
            loading="lazy"
            class="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          >
          <div v-else class="absolute inset-0 bg-gradient-to-br from-primary-800 via-dark-700 to-dark" />
          <div class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

          <div class="absolute inset-x-0 bottom-0 p-3">
            <h3 class="font-heading text-sm md:text-base font-semibold text-white group-hover:text-primary-300 transition-colors line-clamp-1">
              {{ c.label }}
            </h3>
            <p class="mt-1 text-[11px] uppercase tracking-[0.2em] text-white/60">
              {{ t('products.productCount', { count: c.count }) }}
            </p>
          </div>
        </NuxtLink>
      </div>
    </div>
  </section>
</template>
