<script setup lang="ts">
const { items: galleryItems } = useGallery()

const { t, locale } = useI18n()

const filters = computed(() => [
  { id: 'all', label: locale.value === 'vi' ? 'Tất cả' : 'All' },
  { id: 'tea', label: locale.value === 'vi' ? 'Trà Việt' : 'Vietnamese Tea' },
  { id: 'oolong', label: locale.value === 'vi' ? 'Ô long' : 'Oolong' },
  { id: 'herbal', label: locale.value === 'vi' ? 'Thảo mộc' : 'Herbal' },
  { id: 'gift', label: locale.value === 'vi' ? 'Quà tặng' : 'Gifts' },
  { id: 'space', label: locale.value === 'vi' ? 'Không gian' : 'Space' },
])

const activeFilter = ref('all')

const items = computed(() =>
  galleryItems.value.map(item => ({
    ...item,
    visible: activeFilter.value === 'all' || item.category === activeFilter.value,
  })),
)
</script>

<template>
  <section class="section-py bg-[#27282b]" aria-labelledby="gallery-filter-heading">
    <div class="container-page">

      <!-- Heading -->
      <div class="text-center mb-10 md:mb-14 animate-on-scroll">
        <p class="font-condensed text-primary-400 text-xs uppercase tracking-[0.25em] mb-3">
          {{ t('gallery.eyebrow') }}
        </p>
        <h2 id="gallery-filter-heading" class="section-heading text-white mb-4">
          {{ t('gallery.title') }}
        </h2>
        <div class="divider-gold" />
      </div>

      <!-- Filter tabs — Modis style -->
      <div
        class="flex flex-wrap justify-center gap-0 mb-8 animate-on-scroll border border-white/10"
        role="tablist"
        :aria-label="t('gallery.title')"
      >
        <button
          v-for="f in filters"
          :key="f.id"
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

      <!-- Grid -->
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        <TransitionGroup name="gallery-item" tag="div" class="contents">
          <div
            v-for="item in items"
            v-show="item.visible"
            :key="item.id"
            class="relative aspect-[4/3] overflow-hidden group gallery-cell"
          >
            <NuxtImg
              :src="item.src"
              :alt="item.label"
              class="w-full h-full object-cover transition-transform duration-500
                     group-hover:scale-110"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              format="webp"
              loading="lazy"
            />
            <!-- Hover overlay -->
            <div
              class="absolute inset-0 bg-primary-500/0 group-hover:bg-primary-500/80
                     transition-all duration-300 flex items-center justify-center"
            >
              <span
                class="text-white text-sm font-condensed uppercase tracking-widest
                       opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0
                       transition-all duration-300"
              >
                {{ item.label }}
              </span>
            </div>
          </div>
        </TransitionGroup>
      </div>
    </div>
  </section>
</template>

<style scoped>
.gallery-item-enter-active,
.gallery-item-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.gallery-item-enter-from,
.gallery-item-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
.gallery-cell {
  display: block;
}
</style>
