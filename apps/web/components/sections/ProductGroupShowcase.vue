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
  /** Sản phẩm bộ sưu tập gắn với danh mục — hiện menu phải tự cuộn khi có. */
  sidebarProducts?: Product[]
  sidebarTitle?: string
}>()

const { t, locale } = useI18n()
const localePath = useLocalePath()

const priceLocale = computed(() => (locale.value === 'en' ? 'en-US' : 'vi-VN'))
const bannerImage = computed(() => props.image || props.products[0]?.image || null)

const sidebarItems = computed(() =>
  (props.sidebarProducts ?? []).slice(0, 10).map(p => ({
    key: p.slug,
    to: localePath(`/san-pham/${p.slug}`),
    image: p.image,
    title: p.title,
    description: p.shortDesc,
    subtitle: formatMoney(p.price, p.currencyCode, priceLocale.value),
    product: { variantId: p.variantId, slug: p.slug, inStock: p.quickAddInStock },
  })),
)

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
    <!-- -mt-[72px] kéo banner lên dưới header fixed (main có pt-[72px]).
         sticky top-0: banner ghim lại cùng menu khi scroll, nội dung trượt
         phía sau. -->
    <section ref="bannerEl" class="sticky top-0 z-40 -mt-[72px] bg-dark">
      <div class="relative h-[90px] sm:h-[112px] md:h-[140px] overflow-hidden">
        <img v-if="bannerImage" :src="bannerImage" :alt="heading" class="absolute inset-0 h-full w-full object-cover">
        <div v-else class="absolute inset-0 bg-gradient-to-br from-primary-800 via-dark-700 to-dark" />
        <div class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/25" />
        <div class="relative h-full container-page flex flex-col justify-end pb-0 md:pb-0">
          <h1 class="font-heading text-xl sm:text-2xl md:text-3xl font-bold max-w-3xl line-clamp-1">
            {{ heading }}
          </h1>
          <p
            class="mt-0 md:inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-primary-300">
            <span class="h-[2px] w-8 bg-primary-400 inline-block" />
            {{ t('products.productCount', { count: products.length }) }}
          </p>
        </div>
      </div>
    </section>

    <!-- ── Group switcher ───────────────────────────── -->
    <!-- <div v-if="items.length > 1" class="border-b border-white/10 bg-dark-800">
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
    </div> -->

    <!-- ── Product grid (+ menu bộ sưu tập bên phải nếu có) ── -->
    <section class="section-py bg-dark" aria-labelledby="group-products-heading">
      <div class="container-page">
        <h2 id="group-products-heading" class="sr-only">{{ heading }}</h2>

        <div class="grid grid-cols-1 gap-10 xl:gap-14"
          :class="sidebarItems.length ? 'lg:grid-cols-[minmax(0,1fr)_300px]' : ''">
          <div class="min-w-0">
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

            <!-- Image-led cards: photo, name, short desc, price + cart actions -->
            <div v-else class="grid grid-cols-2 gap-3 md:gap-5" :class="sidebarItems.length ? 'sm:grid-cols-3 lg:grid-cols-3' : 'sm:grid-cols-4 lg:grid-cols-4'
              ">
              <article v-for="p in products" :key="p.id" class="group flex flex-col animate-on-scroll">
                <NuxtLink :to="localePath(`/san-pham/${p.slug}`)" :aria-label="p.title" class="relative block aspect-[4/5] overflow-hidden rounded-xl bg-[#2a3326] shadow-lg
                     ring-1 ring-white/10 group-hover:ring-primary-400/60
                     transition-all duration-300 h-[200px] md:h-[250px]">
                  <img :src="p.image" :alt="p.title" loading="lazy"
                    class="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105">
                  <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-3 pt-8">
                    <h3 class="font-heading text-sm md:text-base font-semibold text-white
                         group-hover:text-primary-300 transition-colors line-clamp-1">
                      {{ p.title }}
                    </h3>
                  </div>
                </NuxtLink>

                <p class="mt-2 text-start text-primary-400 text-xs font-semibold">
                  {{ formatMoney(p.price, p.currencyCode, priceLocale) }}
                </p>
                <!-- <p v-if="p.shortDesc" class="mt-0 text-start text-white/50 text-xs leading-relaxed line-clamp-1">
                  {{ p.shortDesc }}
                </p> -->
                <ProductCardActions :variant-id="p.variantId" :slug="p.slug" :in-stock="p.quickAddInStock"
                  class="mt-auto pt-2.5" />
              </article>
            </div>
          </div>

          <!-- Menu phải: sản phẩm bộ sưu tập gắn với danh mục, tự cuộn từ dưới
             lên (giống bài viết cùng chủ đề). top tính theo cụm ghim:
             banner + marquee -->
          <aside v-if="sidebarItems.length" class="lg:sticky lg:top-[190px] lg:self-start"
            :aria-label="sidebarTitle || t('products.collectionSidebar')">
            <h2 class="mb-4 flex items-center gap-2 font-heading text-lg font-semibold text-white">
              <span class="h-[2px] w-6 bg-primary-400 inline-block flex-none" />
              <span class="truncate">{{ sidebarTitle || t('products.collectionSidebar') }}</span>
            </h2>

            <WidgetsAutoScrollSidebar :items="sidebarItems" />
          </aside>
        </div>
      </div>
    </section>
  </div>
</template>
