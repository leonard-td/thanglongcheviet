<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
const localePath = useLocalePath()
const { site } = useSettings()
const { topics, getTopicBySlug } = useTopicsByType('product')
const { byTopic, pending: productsPending } = useProducts()

useScrollAnimation()

const slug = computed(() => String(route.params.slug))

const { data, pending: topicPending } = useAsyncData(
  () => `product-topic-${slug.value}`,
  () => getTopicBySlug(slug.value),
  { watch: [slug] },
)

const pending = computed(() => topicPending.value || productsPending.value)

watchEffect(() => {
  if (!topicPending.value && !data.value) {
    throw createError({ statusCode: 404, statusMessage: 'Topic not found', fatal: true })
  }
})

// Banner full-bleed: header trong suốt nằm đè lên banner, chuyển nền đặc
// khi scroll hết banner (xem composables/useHeaderBanner.ts)
const bannerEl = ref<HTMLElement | null>(null)
useBannerHeader(bannerEl)

const topic = computed(() => data.value ?? null)
const products = computed(() => (topic.value ? byTopic(topic.value.id) : []))

const formatPrice = (price: number) =>
  `${price.toLocaleString('vi-VN')} ${t('common.currency')}`

useSeoMeta({
  title: () => `${topic.value?.name ?? ''} | ${t('products.label')} | ${site.value.name}`,
  description: () => topic.value?.description || t('products.subtitle'),
  ogImage: () => topic.value?.image || undefined,
})
</script>

<template>
  <div class="bg-dark min-h-[60vh]">
    <!-- ── Topic banner ─────────────────────────────── -->
    <section ref="bannerEl" class="sticky top-0 z-40 -mt-[72px] bg-dark text-white">
      <div class="relative h-[105px] sm:h-[125px] md:h-[155px] overflow-hidden">
        <img v-if="topic?.image" :src="topic.image" :alt="topic?.name || ''"
          class="absolute inset-0 h-full w-full object-cover">
        <div v-else class="absolute inset-0 bg-gradient-to-br from-primary-800 via-dark-700 to-dark" />
        <div class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20" />

        <div class="relative h-full container-page flex flex-col justify-end pb-3 md:pb-4">
          <h1 class="font-heading text-xl sm:text-2xl md:text-3xl font-bold max-w-3xl line-clamp-1">
            {{ topic?.name }}
          </h1>
          <p class="mt-1.5 hidden md:inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-primary-300">
            <span class="h-[2px] w-8 bg-primary-400 inline-block" />
            {{ t('products.topics.itemCount', { count: products.length }) }}
          </p>
        </div>
      </div>
    </section>

    <!-- ── Product grid + topics menu ────────────────── -->
    <section class="section-py bg-dark" aria-labelledby="topic-products-heading">
      <div class="container-page">
        <h2 id="topic-products-heading" class="sr-only">{{ topic?.name }}</h2>

        <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-10 xl:gap-14">
        <div class="min-w-0">
        <!-- Loading skeleton -->
        <div v-if="pending" class="grid grid-cols-2 sm:grid-cols-3 gap-4 md:gap-5">
          <div v-for="n in 6" :key="n" class="border border-white/10 bg-white/[0.04] overflow-hidden animate-pulse">
            <div class="aspect-[4/3] bg-white/5" />
            <div class="p-3 md:p-4 space-y-3">
              <div class="h-4 w-3/4 mx-auto rounded bg-white/10" />
              <div class="h-3 w-1/2 mx-auto rounded bg-white/10" />
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div v-else-if="!products.length" class="py-8 text-center">
          <p class="font-heading text-xl text-white mb-2">{{ t('products.topics.emptyTitle') }}</p>
          <p class="text-sm text-white/60 mb-8">{{ t('products.topics.emptyDesc') }}</p>
          <NuxtLink :to="localePath('/san-pham-list')" class="btn-primary">
            {{ t('products.viewAllProducts') }}
          </NuxtLink>
        </div>

        <div v-else class="grid grid-cols-2 sm:grid-cols-3 gap-4 md:gap-5">
          <article v-for="p in products" :key="p.id" class="group border border-white/10 bg-[#1f1f1f] overflow-hidden
                   hover:border-primary-500/50 transition-colors duration-300 animate-on-scroll">
            <NuxtLink :to="localePath(`/san-pham/${p.slug}`)" class="block relative aspect-[4/3] overflow-hidden bg-[#2a3326]">
              <img :src="p.image" :alt="p.title" loading="lazy"
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
            </NuxtLink>
            <div class="p-3 md:p-4 text-center">
              <h3 class="font-heading text-sm md:text-base font-semibold text-white mb-1.5">
                <NuxtLink :to="localePath(`/san-pham/${p.slug}`)" class="group-hover:text-primary-400 transition-colors">
                  {{ p.title }}
                </NuxtLink>
              </h3>
              <p class="text-primary-400 font-semibold text-sm mb-3">
                {{ formatPrice(p.price) }}
              </p>
              <ProductCardActions :variant-id="p.variantId" :slug="p.slug" :in-stock="p.inStock" />
            </div>
          </article>
        </div>
        </div>

        <!-- ── Menu chủ đề bên phải ─────────────────── -->
        <aside
          v-if="topics.length"
          class="lg:sticky lg:top-[210px] lg:self-start"
          :aria-label="t('products.topics.browse')"
        >
          <h2 class="mb-4 flex items-center gap-2 font-heading text-lg font-semibold text-white">
            <span class="h-[2px] w-6 bg-primary-400 inline-block flex-none" />
            <span class="truncate">{{ t('products.topics.browse') }}</span>
          </h2>
          <nav class="rounded-2xl bg-white/[0.03] ring-1 ring-white/10 overflow-hidden">
            <ul>
              <li v-for="item in topics" :key="item.id" class="border-b border-white/5 last:border-0">
                <NuxtLink
                  :to="localePath(`/san-pham/chu-de/${item.slug}`)"
                  class="flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors"
                  :class="item.slug === slug
                    ? 'bg-primary-500/15 text-primary-300'
                    : 'text-white/70 hover:bg-white/[0.05] hover:text-primary-300'"
                >
                  <span class="truncate">{{ item.name }}</span>
                </NuxtLink>
              </li>
            </ul>
          </nav>
        </aside>
        </div>
      </div>
    </section>
  </div>
</template>
