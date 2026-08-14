<script setup lang="ts">
import { formatMoney } from '~/utils/storefront'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const { featuredProducts, pending } = useProducts()

const priceLocale = computed(() => (locale.value === 'en' ? 'en-US' : 'vi-VN'))
</script>

<template>
  <section class="section-py bg-dark-800" aria-labelledby="featured-heading">
    <div class="container-page">
      <div class="text-center mb-10 animate-on-scroll">
        <p class="text-xs uppercase tracking-[0.25em] text-primary-400 mb-2">
          {{ t('products.featuredTitle') }}
        </p>
        <!-- <h2 id="featured-heading" class="section-heading text-white mb-4">
          {{ t('products.featuredTitle') }}
        </h2> -->
        <div class="divider-gold" />
      </div>

      <!-- Loading skeleton -->
      <div v-if="pending && !featuredProducts.length" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
        <div v-for="n in 4" :key="n" class="animate-pulse">
          <div class="aspect-[4/5] rounded-xl bg-white/5 ring-1 ring-white/10" />
          <div class="mx-auto mt-3 h-3 w-2/3 rounded bg-white/10" />
          <div class="mx-auto mt-2 h-2.5 w-1/3 rounded bg-white/10" />
        </div>
      </div>

      <div
        v-else-if="featuredProducts.length"
        class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5"
      >
        <article
          v-for="p in featuredProducts"
          :key="p.id"
          class="group flex flex-col animate-on-scroll"
        >
          <NuxtLink
            :to="localePath(`/san-pham/${p.slug}`)"
            :aria-label="p.title"
            class="relative block aspect-[4/5] overflow-hidden rounded-xl bg-[#2a3326] shadow-lg
                   ring-1 ring-white/10 group-hover:ring-primary-400/60
                   transition-all duration-300 h-[200px] md:h-[250px]"
          >
            <img
              :src="p.image"
              :alt="p.title"
              loading="lazy"
              class="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            >
            <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-3 pt-8">
              <h3 class="font-heading text-sm md:text-base font-semibold text-white group-hover:text-primary-300 transition-colors line-clamp-1">
                {{ p.title }}
              </h3>
            </div>
          </NuxtLink>

          <p class="mt-2 text-start text-primary-400 text-xs font-semibold">
            {{ formatMoney(p.price, p.currencyCode, priceLocale) }}
          </p>
          <ProductCardActions
            :variant-id="p.variantId"
            :slug="p.slug"
            :in-stock="p.inStock"
            class="mt-auto pt-2.5"
          />
        </article>
      </div>

      <div class="text-center mt-10 animate-on-scroll">
        <NuxtLink :to="localePath('/san-pham-list#all')" class="btn-ghost">
          {{ t('products.viewAllProducts') }}
        </NuxtLink>
      </div>
    </div>
  </section>
</template>
