<script setup lang="ts">
import { Swiper, SwiperSlide } from 'swiper/vue'
import { Autoplay, EffectFade, Navigation, Pagination } from 'swiper/modules'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const { heroSlides, heroMeta, contact, hours } = useSettings()

const modules = [Autoplay, EffectFade, Navigation, Pagination]
</script>

<template>
  <section
    class="relative min-h-[100svh] overflow-hidden"
    aria-label="Hero section"
  >
    <ClientOnly>
      <Swiper
        :modules="modules"
        :slides-per-view="1"
        :effect="'fade'"
        :loop="true"
        :autoplay="{ delay: 5500, disableOnInteraction: false }"
        :pagination="{ clickable: true }"
        :navigation="true"
        class="h-full min-h-[100svh]"
      >
        <SwiperSlide
          v-for="slide in heroSlides"
          :key="slide.id"
          class="relative min-h-[100svh]"
        >
          <!-- Background -->
          <div class="absolute inset-0">
            <NuxtImg
              :src="slide.image"
              :alt="slide.imageAlt"
              class="w-full h-full object-cover"
              sizes="100vw"
              format="webp"
              loading="eager"
            />
            <div
              class="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/30"
              :style="{ opacity: slide.overlayOpacity / 100 + 0.15 }"
            />
          </div>

          <!-- Content: Modis split layout -->
          <div class="relative min-h-[100svh] container-page flex flex-col lg:flex-row items-center
                        justify-center lg:justify-between gap-8 lg:gap-12 pt-24 pb-12 lg:pt-28">
            <!-- Left: headline -->
            <div class="max-w-xl text-white text-center lg:text-left">
              <p class="text-white/60 text-sm md:text-base mb-4 leading-relaxed max-w-md mx-auto lg:mx-0">
                {{ heroMeta.commitment }}
              </p>
              <h1
                class="font-heading text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold
                       leading-tight mb-6 whitespace-pre-line"
              >
                {{ slide.heading }}
              </h1>
              <p class="text-white/70 text-base md:text-lg leading-relaxed max-w-lg mx-auto lg:mx-0">
                {{ slide.subheading }}
              </p>
            </div>

            <!-- Right: info box (Modis dark panel) -->
            <aside
              class="w-full max-w-sm lg:max-w-xs xl:max-w-sm flex-shrink-0
                     bg-dark/90 backdrop-blur-sm border border-white/10 p-6 md:p-8
                     text-white animate-on-scroll"
              aria-label="Thông tin website"
            >
              <div class="space-y-6">
                <div>
                  <h2 class="text-xs uppercase tracking-[0.2em] text-primary-400 mb-2 font-medium">
                    {{ t('hero.openingTimes') }}
                  </h2>
                  <ul class="space-y-1">
                    <li
                      v-for="h in hours"
                      :key="h.days"
                      class="text-sm text-white/70"
                    >
                      <span class="text-white">{{ h.days }}:</span> {{ h.time }}
                    </li>
                  </ul>
                </div>

                <div class="w-full h-px bg-white/10" />

                <div>
                  <h2 class="text-xs uppercase tracking-[0.2em] text-primary-400 mb-2 font-medium">
                    {{ t('hero.ourLocation') }}
                  </h2>
                  <p class="text-sm text-white/70 leading-relaxed">
                    {{ contact.address?.[locale as 'vi' | 'en'] ?? contact.address?.vi }}
                  </p>
                </div>

                <div class="w-full h-px bg-white/10" />

                <NuxtLink
                  :to="localePath('/lien-he')"
                  class="btn-primary w-full justify-center text-sm uppercase tracking-wider"
                >
                  {{ t('hero.cta') }}
                </NuxtLink>

                <a
                  :href="`tel:${contact.phone}`"
                  class="block text-center text-2xl md:text-3xl font-heading font-semibold
                         text-primary-400 hover:text-primary-300 transition-colors"
                >
                  {{ contact.phoneDisplay }}
                </a>
              </div>
            </aside>
          </div>
        </SwiperSlide>
      </Swiper>

      <template #fallback>
        <div class="min-h-[100svh] bg-dark flex items-center justify-center">
          <p class="text-white font-heading text-2xl">Thăng Long Chè Việt</p>
        </div>
      </template>
    </ClientOnly>
  </section>
</template>

<style>
@import 'swiper/css';
@import 'swiper/css/effect-fade';
@import 'swiper/css/navigation';
@import 'swiper/css/pagination';

.swiper-pagination-bullet {
  background: rgba(255, 255, 255, 0.5) !important;
}
.swiper-pagination-bullet-active {
  background: #c9a86c !important;
  width: 24px !important;
  border-radius: 4px !important;
}

.swiper-button-prev,
.swiper-button-next {
  color: white !important;
  background: rgba(0, 0, 0, 0.35);
  width: 44px !important;
  height: 44px !important;
  border-radius: 50%;
}
.swiper-button-prev::after,
.swiper-button-next::after {
  font-size: 14px !important;
}
</style>
