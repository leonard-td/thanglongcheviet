<script setup lang="ts">
import type { ProductGroup } from '~/composables/useProducts'
import type { Product } from '~/utils/storefront'
import { formatMoney } from '~/utils/storefront'

const props = defineProps<{
  pending: boolean
  /** Eyebrow above the heading, e.g. "Danh mục" / "Bộ sưu tập". */
  groupLabel: string
  heading: string
  image?: string | null
  /** Sibling groups rendered as switcher pills. */
  items: ProductGroup[]
  activeSlug: string
  /** Locale-neutral base path of the group pages, e.g. "/san-pham/danh-muc". */
  basePath: string
  emptyMessage: string
  products: Product[]
}>()

const { t, locale } = useI18n()
const localePath = useLocalePath()

const priceLocale = computed(() => (locale.value === 'en' ? 'en-US' : 'vi-VN'))
const bannerImage = computed(() => props.image || props.products[0]?.image || null)

// Banner full-bleed: header trong suốt nằm đè lên banner, chuyển nền đặc
// khi scroll hết banner (xem composables/useHeaderBanner.ts). Component này
// là template dùng chung cho cả trang danh mục và bộ sưu tập nên chỉ cần
// gọi 1 lần ở đây.
const bannerEl = ref<HTMLElement | null>(null)
useBannerHeader(bannerEl)
</script>

<template>
  <div class="bg-dark min-h-[60vh] text-white">
    <!-- ── Group banner ─────────────────────────────── -->
    <!-- -mt-[72px] kéo banner lên dưới header fixed (main có pt-[72px]) -->
    <section ref="bannerEl" class="relative -mt-[72px] bg-dark">
      <div class="relative h-[180px] sm:h-[225px] md:h-[280px] overflow-hidden">
        <img
          v-if="bannerImage"
          :src="bannerImage"
          :alt="heading"
          class="absolute inset-0 h-full w-full object-cover"
        >
        <div v-else class="absolute inset-0 bg-gradient-to-br from-primary-800 via-dark-700 to-dark" />
        <div class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/25" />

        <div class="relative h-full container-page flex flex-col justify-end pb-5 md:pb-8">
          <!-- <nav class="mb-4 text-xs uppercase tracking-[0.2em] text-white/70" aria-label="breadcrumb">
            <ol class="flex flex-wrap items-center gap-2">
              <li>
                <NuxtLink :to="localePath('/')" class="hover:text-primary-300 transition-colors">
                  {{ t('nav.home') }}
                </NuxtLink>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <NuxtLink :to="localePath('/san-pham-list')" class="hover:text-primary-300 transition-colors">
                  {{ t('products.label') }}
                </NuxtLink>
              </li>
              <li aria-hidden="true">/</li>
              <li class="text-primary-300">{{ heading }}</li>
            </ol>
          </nav> -->

          <!-- <p class="modis-eyebrow mb-2">{{ groupLabel }}</p> -->
          <h1 class="font-heading text-3xl sm:text-4xl md:text-5xl font-bold max-w-3xl">
            {{ heading }}
          </h1>
          <p class="mt-4 inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-primary-300">
            <span class="h-[2px] w-8 bg-primary-400 inline-block" />
            {{ t('products.productCount', { count: products.length }) }}
          </p>
        </div>
      </div>
    </section>

    <!-- ── Group switcher ───────────────────────────── -->
    <div v-if="items.length > 1" class="border-b border-white/10 bg-dark-800">
      <div class="container-page py-4 flex flex-wrap items-center gap-2">
        <span class="text-xs uppercase tracking-[0.2em] text-white/50 mr-1">
          {{ groupLabel }}
        </span>
        <NuxtLink
          v-for="item in items"
          :key="item.id"
          :to="localePath(`${basePath}/${item.slug}`)"
          class="rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors"
          :class="item.slug === activeSlug
            ? 'bg-primary-500 text-white shadow'
            : 'bg-white/5 text-white/60 hover:bg-primary-500/20 hover:text-primary-300'"
        >
          {{ item.label }}
        </NuxtLink>
      </div>
    </div>

    <!-- ── Product grid ─────────────────────────────── -->
    <section class="section-py bg-dark" aria-labelledby="group-products-heading">
      <div class="container-page">
        <h2 id="group-products-heading" class="sr-only">{{ heading }}</h2>

        <!-- Loading skeleton -->
        <div v-if="pending" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
          <div v-for="n in 8" :key="n" class="animate-pulse">
            <div class="aspect-[4/5] rounded-xl bg-white/5 ring-1 ring-white/10" />
            <div class="mx-auto mt-3 h-3 w-2/3 rounded bg-white/10" />
            <div class="mx-auto mt-2 h-2.5 w-1/3 rounded bg-white/10" />
          </div>
        </div>

        <!-- Empty state -->
        <div v-else-if="!products.length" class="py-16 text-center">
          <p class="font-heading text-xl text-white mb-2">{{ emptyMessage }}</p>
          <NuxtLink :to="localePath('/san-pham-list')" class="btn-primary">
            {{ t('products.viewAllProducts') }}
          </NuxtLink>
        </div>

        <!-- Image-led minimal cards: photo, name, price — nothing else -->
        <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
          <NuxtLink
            v-for="p in products"
            :key="p.id"
            :to="localePath(`/san-pham/${p.slug}`)"
            class="group block animate-on-scroll"
            :aria-label="p.title"
          >
            <div
              class="relative aspect-[4/5] overflow-hidden rounded-xl bg-[#2a3326] shadow-lg
                     ring-1 ring-white/10 group-hover:ring-primary-400/60
                     transition-all duration-300"
            >
              <img
                :src="p.image"
                :alt="p.title"
                loading="lazy"
                class="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
              >
              <div class="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            <h3
              class="mt-3 text-center font-heading text-sm md:text-base font-semibold text-white
                     group-hover:text-primary-400 transition-colors line-clamp-2"
            >
              {{ p.title }}
            </h3>
            <p class="mt-1 text-center text-primary-400 text-xs font-semibold">
              {{ formatMoney(p.price, p.currencyCode, priceLocale) }}
            </p>
          </NuxtLink>
        </div>
      </div>
    </section>
  </div>
</template>
