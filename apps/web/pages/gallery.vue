<script setup lang="ts">
const { t } = useI18n()

useScrollAnimation()

const { imageUrls: galleryImages } = useGallery()

useSeoMeta({
  title: () => t('nav.gallery'),
  description: () => t('gallery.subtitle'),
})
</script>

<template>
  <div class="bg-dark">
    <LayoutPageHero
      :label="t('nav.gallery')"
      :title="t('gallery.title')"
      :subtitle="t('gallery.subtitle')"
    />
    <section class="section-py bg-dark-800" aria-label="Gallery">
      <div class="container-page">
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          <div
            v-for="(src, i) in galleryImages"
            :key="i"
            class="relative aspect-square overflow-hidden group animate-on-scroll"
          >
            <NuxtImg
              :src="src"
              :alt="`${t('gallery.title')} ${i + 1}`"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 768px) 50vw, 25vw"
              format="webp"
              loading="lazy"
            />
          </div>
        </div>
        <p class="text-center text-white/40 text-sm mt-10">
          {{ t('gallery.comingSoon') }}
        </p>
      </div>
    </section>
  </div>
</template>
