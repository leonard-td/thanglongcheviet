<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const { products, categories, byCategory, pending } = useProducts()

const filters = computed(() => [
  { id: 'all', label: t('products.filterAll') },
  ...categories.value.map(c => ({ id: c.id, label: c.label })),
])

const activeFilter = ref('all')

watch(filters, (list) => {
  if (!list.find(f => f.id === activeFilter.value)) activeFilter.value = 'all'
})

// Render every product permanently and toggle visibility with v-show instead
// of filtering the v-for source: useScrollAnimation() only observes elements
// present at mount, so swapping the v-for array on filter change would create
// brand-new .animate-on-scroll nodes that never get observed and stay stuck
// at opacity:0 (see apps/web/composables/useScrollAnimation.ts).
const displayProducts = computed(() =>
  products.value.map(p => ({
    ...p,
    visible: activeFilter.value === 'all' || byCategory(activeFilter.value).some(m => m.id === p.id),
  })),
)
const hasVisibleProducts = computed(() => displayProducts.value.some(p => p.visible))

const formatPrice = (price: number) =>
  `${price.toLocaleString('vi-VN')} ${t('common.currency')}`
</script>

<template>
  <section class="section-py" aria-label="Product catalog">
    <div class="container-page">
      <!-- Category filter -->
      <div
        v-if="filters.length > 1"
        class="flex flex-wrap justify-center gap-0 mb-10 animate-on-scroll border border-white/10"
        role="tablist"
        :aria-label="t('products.title')"
      >
        <button
          v-for="f in filters"
          :key="f.id"
          type="button"
          role="tab"
          :aria-selected="activeFilter === f.id"
          class="min-h-[44px] px-5 md:px-8 py-3 font-condensed text-xs uppercase tracking-widest
                 border-r border-white/10 last:border-r-0 transition-all duration-200"
          :class="activeFilter === f.id
            ? 'bg-primary-500 text-white'
            : 'bg-[#222] text-white/60 hover:text-white hover:bg-[#2e2e2e]'"
          @click="activeFilter = f.id"
        >
          {{ f.label }}
        </button>
      </div>

      <p v-if="pending && !products.length" class="text-center text-white/50 py-10">
        {{ t('common.loading') }}
      </p>
      <p v-else-if="!products.length" class="text-center text-white/50 py-10">
        {{ t('products.empty') }}
      </p>

      <template v-else>
        <p v-if="!hasVisibleProducts" class="text-center text-white/50 py-10">
          {{ t('products.empty') }}
        </p>

        <!-- Product grid — every product stays mounted; v-show toggles the
             active filter so useScrollAnimation()'s one-time observer (see
             composables/useScrollAnimation.ts) keeps working across filter
             changes instead of only for whatever was present at mount. -->
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
          <article
            v-for="p in displayProducts"
            v-show="p.visible"
            :key="p.id"
            class="group border border-white/10 bg-[#1f1f1f] overflow-hidden
                   hover:border-primary-500/50 transition-colors duration-300 animate-on-scroll"
          >
          <NuxtLink :to="localePath(`/san-pham/${p.slug}`)" class="block relative aspect-[4/3] overflow-hidden bg-[#2a3326]">
            <img
              :src="p.image"
              :alt="p.title"
              loading="lazy"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            >
          </NuxtLink>
          <div class="p-3 md:p-4 text-center">
            <h3 class="font-heading text-sm md:text-base font-semibold text-white mb-1.5">
              <NuxtLink :to="localePath(`/san-pham/${p.slug}`)" class="group-hover:text-primary-400 transition-colors">
                {{ p.title }}
              </NuxtLink>
            </h3>
            <p class="text-white/50 text-xs leading-relaxed mb-2.5 line-clamp-2">
              {{ p.shortDesc }}
            </p>
            <p class="text-primary-400 font-semibold text-sm mb-3">
              {{ formatPrice(p.price) }}
            </p>
            <ProductCardActions :variant-id="p.variantId" :slug="p.slug" :in-stock="p.inStock" />
          </div>
        </article>
        </div>
      </template>
    </div>
  </section>
</template>
