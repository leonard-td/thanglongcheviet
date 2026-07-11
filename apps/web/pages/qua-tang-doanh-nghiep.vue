<script setup lang="ts">
import { formatMoney } from '~/utils/storefront'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const priceLocale = computed(() => (locale.value === 'en' ? 'en-US' : 'vi-VN'))

const { products } = useProducts()

const giftProducts = computed(() => 
  products.value.filter(p => (p.slug && p.slug.includes('qua-')) || (p.title && p.title.toLowerCase().includes('quà')))
)

useScrollAnimation()

useSeoMeta({
  title: () => t('corporate.title'),
  description: () => t('corporate.subtitle'),
})
</script>

<template>
  <div>
    <!-- 1. Hero with Background Image -->
    <section class="relative pt-32 pb-24 md:pt-40 md:pb-32 overflow-hidden">
      <!-- Background Image -->
      <div class="absolute inset-0 z-0">
        <NuxtImg src="/images/hero/hero-2.jpg" alt="Corporate Gifts" class="w-full h-full object-cover object-center" priority />
        <div class="absolute inset-0 bg-black/60 backdrop-blur-[2px]"></div>
      </div>
      
      <!-- Content -->
      <div class="container-page relative z-10 text-center animate-on-scroll">
        <p class="modis-eyebrow mb-4 justify-center text-primary-400">
          {{ t('nav.productsMenu.corporateGifts') }}
        </p>
        <h1 class="font-heading text-4xl sm:text-5xl md:text-6xl font-bold mb-6 text-white drop-shadow-md">
          {{ t('corporate.title') }}
        </h1>
        <div class="divider-gold drop-shadow-md" />
        <p class="text-white/90 mt-6 max-w-2xl mx-auto text-base md:text-lg leading-relaxed drop-shadow-md font-medium">
          {{ t('corporate.subtitle') }}
        </p>
      </div>
    </section>

    <!-- 2. Value Propositions -->
    <section class="section-py bg-[#1a1a1a] text-white">
      <div class="container-page">
        <div class="text-center mb-16 animate-on-scroll">
          <h3 class="text-xs uppercase tracking-widest text-primary-400 mb-2 mt-1">
            {{ t('corporate.values.eyebrow') }}
          </h3>
          <h2 class="text-3xl lg:text-4xl font-light">
            {{ t('corporate.values.title') }}
          </h2>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div class="p-8 bg-white/5 border border-white/10 hover:border-primary-500/50 transition-colors animate-on-scroll group text-center hover:bg-white/10">
            <div class="w-16 h-16 mx-auto bg-primary-500/20 rounded-full flex items-center justify-center mb-6 group-hover:bg-primary-500/40 transition-colors group-hover:scale-110 duration-300">
              <span class="text-2xl">✨</span>
            </div>
            <h4 class="text-lg font-medium mb-3 text-white group-hover:text-primary-400 transition-colors">{{ t('corporate.values.customLogo') }}</h4>
            <p class="text-sm text-white/70">{{ t('corporate.values.customLogoDesc') }}</p>
          </div>

          <div class="p-8 bg-white/5 border border-white/10 hover:border-primary-500/50 transition-colors animate-on-scroll group text-center hover:bg-white/10" style="transition-delay: 100ms;">
            <div class="w-16 h-16 mx-auto bg-primary-500/20 rounded-full flex items-center justify-center mb-6 group-hover:bg-primary-500/40 transition-colors group-hover:scale-110 duration-300">
              <span class="text-2xl">🌿</span>
            </div>
            <h4 class="text-lg font-medium mb-3 text-white group-hover:text-primary-400 transition-colors">{{ t('corporate.values.premiumQuality') }}</h4>
            <p class="text-sm text-white/70">{{ t('corporate.values.premiumQualityDesc') }}</p>
          </div>

          <div class="p-8 bg-white/5 border border-white/10 hover:border-primary-500/50 transition-colors animate-on-scroll group text-center hover:bg-white/10" style="transition-delay: 200ms;">
            <div class="w-16 h-16 mx-auto bg-primary-500/20 rounded-full flex items-center justify-center mb-6 group-hover:bg-primary-500/40 transition-colors group-hover:scale-110 duration-300">
              <span class="text-2xl">🎁</span>
            </div>
            <h4 class="text-lg font-medium mb-3 text-white group-hover:text-primary-400 transition-colors">{{ t('corporate.values.elegantDesign') }}</h4>
            <p class="text-sm text-white/70">{{ t('corporate.values.elegantDesignDesc') }}</p>
          </div>

          <div class="p-8 bg-white/5 border border-white/10 hover:border-primary-500/50 transition-colors animate-on-scroll group text-center hover:bg-white/10" style="transition-delay: 300ms;">
            <div class="w-16 h-16 mx-auto bg-primary-500/20 rounded-full flex items-center justify-center mb-6 group-hover:bg-primary-500/40 transition-colors group-hover:scale-110 duration-300">
              <span class="text-2xl">🤝</span>
            </div>
            <h4 class="text-lg font-medium mb-3 text-white group-hover:text-primary-400 transition-colors">{{ t('corporate.values.discounts') }}</h4>
            <p class="text-sm text-white/70">{{ t('corporate.values.discountsDesc') }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 2.5 Featured Gift Products -->
    <section v-if="giftProducts.length > 0" class="section-py bg-[#121212] text-white">
      <div class="container-page overflow-hidden">
        <div class="text-center mb-12 animate-on-scroll">
          <h3 class="text-xs uppercase tracking-widest text-primary-400 mb-2 mt-1">
            Mẫu quà tặng
          </h3>
          <h2 class="text-3xl lg:text-4xl font-light">
            Sản phẩm tiêu biểu
          </h2>
        </div>

        <div class="flex overflow-x-auto gap-6 md:gap-8 pb-8 snap-x snap-mandatory custom-scrollbar">
          <NuxtLink
            v-for="p in giftProducts"
            :key="p.id"
            :to="localePath(`/san-pham/${p.slug}`)"
            class="group block flex-none w-[280px] md:w-[320px] snap-center animate-on-scroll"
            :aria-label="p.title"
          >
            <div
              class="relative aspect-[4/5] overflow-hidden rounded-xl bg-[#2a3326] shadow-lg
                     ring-1 ring-white/10 group-hover:ring-primary-400/60
                     transition-all duration-300"
            >
              <NuxtImg
                v-if="p.image"
                :src="p.image"
                :alt="p.title"
                loading="lazy"
                class="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
              />
              <div v-else class="h-full w-full bg-dark flex flex-col items-center justify-center text-white/30 border-2 border-dashed border-white/10">
                <span class="text-5xl mb-2">🎁</span>
                <span class="text-sm">Gift Box</span>
              </div>
              <div class="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            <h3
              class="mt-4 text-center font-heading text-base md:text-lg font-semibold text-white
                     group-hover:text-primary-400 transition-colors line-clamp-2"
            >
              {{ p.title }}
            </h3>
            <p class="mt-1 text-center text-primary-400 text-sm font-semibold">
              {{ formatMoney(p.price, p.currencyCode, priceLocale) }}
            </p>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- 3. Showcase Banner -->
    <section class="w-full h-[50vh] min-h-[400px] relative overflow-hidden group">
      <NuxtImg src="/images/hero/hero-1.jpg" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[20s]" loading="lazy" alt="Corporate Gifts Banner" />
      <div class="absolute inset-0 bg-black/40 flex items-center justify-center">
        <div class="text-center px-4 animate-on-scroll">
          <p class="text-primary-400 text-sm md:text-lg uppercase tracking-[0.3em] mb-4 font-medium drop-shadow-lg">Thăng Long Chè Việt</p>
          <h3 class="text-4xl md:text-6xl font-heading font-bold text-white leading-tight drop-shadow-xl">Món quà tri ân<br/>trọn vẹn tâm tình</h3>
        </div>
      </div>
    </section>

    <!-- 4. Process -->
    <section class="section-py bg-dark text-white border-t border-white/5">
      <div class="container-page">
        <div class="text-center mb-16 animate-on-scroll">
          <h3 class="text-xs uppercase tracking-widest text-primary-400 mb-2 mt-1">
            {{ t('corporate.process.eyebrow') }}
          </h3>
          <h2 class="text-3xl lg:text-4xl font-light">
            {{ t('corporate.process.title') }}
          </h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
          <!-- Connective line for desktop -->
          <div class="hidden md:block absolute top-12 left-[12.5%] right-[12.5%] h-px bg-primary-500/30 z-0"></div>
          
          <div class="relative z-10 text-center animate-on-scroll group">
            <div class="w-24 h-24 mx-auto bg-dark border-2 border-white/10 group-hover:border-primary-500 rounded-full flex items-center justify-center mb-6 text-primary-400 text-3xl font-light transition-colors shadow-lg shadow-black/50">01</div>
            <h4 class="text-lg font-medium mb-2 group-hover:text-primary-400 transition-colors">{{ t('corporate.process.step1') }}</h4>
            <p class="text-sm text-white/70">{{ t('corporate.process.step1Desc') }}</p>
          </div>

          <div class="relative z-10 text-center animate-on-scroll group" style="transition-delay: 100ms;">
            <div class="w-24 h-24 mx-auto bg-dark border-2 border-white/10 group-hover:border-primary-500 rounded-full flex items-center justify-center mb-6 text-primary-400 text-3xl font-light transition-colors shadow-lg shadow-black/50">02</div>
            <h4 class="text-lg font-medium mb-2 group-hover:text-primary-400 transition-colors">{{ t('corporate.process.step2') }}</h4>
            <p class="text-sm text-white/70">{{ t('corporate.process.step2Desc') }}</p>
          </div>

          <div class="relative z-10 text-center animate-on-scroll group" style="transition-delay: 200ms;">
            <div class="w-24 h-24 mx-auto bg-dark border-2 border-white/10 group-hover:border-primary-500 rounded-full flex items-center justify-center mb-6 text-primary-400 text-3xl font-light transition-colors shadow-lg shadow-black/50">03</div>
            <h4 class="text-lg font-medium mb-2 group-hover:text-primary-400 transition-colors">{{ t('corporate.process.step3') }}</h4>
            <p class="text-sm text-white/70">{{ t('corporate.process.step3Desc') }}</p>
          </div>

          <div class="relative z-10 text-center animate-on-scroll group" style="transition-delay: 300ms;">
            <div class="w-24 h-24 mx-auto bg-dark border-2 border-white/10 group-hover:border-primary-500 rounded-full flex items-center justify-center mb-6 text-primary-400 text-3xl font-light transition-colors shadow-lg shadow-black/50">04</div>
            <h4 class="text-lg font-medium mb-2 group-hover:text-primary-400 transition-colors">{{ t('corporate.process.step4') }}</h4>
            <p class="text-sm text-white/70">{{ t('corporate.process.step4Desc') }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 5. Form -->
    <SectionsCorporateContactSection />
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  height: 8px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(212, 175, 55, 0.3); /* Primary color with opacity */
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(212, 175, 55, 0.6);
}
</style>
