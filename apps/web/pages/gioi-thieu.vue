<script setup lang="ts">
import { formatMoney, stripHtml } from '~/utils/storefront'

const { t } = useI18n()
const localePath = useLocalePath()
const {
  pending,
  aboutTitle,
  aboutThumbnail,
  aboutHtml,
  aboutCollectionId,
} = useSiteSettings()
const { site } = useSettings()
const { byCollection } = useProducts()

useScrollAnimation()

// Banner full-bleed: header trong suốt nằm đè lên banner (xem useHeaderBanner)
const bannerEl = ref<HTMLElement | null>(null)
useBannerHeader(bannerEl)

const title = computed(() => aboutTitle.value || t('about.title'))

// Sidebar: sản phẩm của bộ sưu tập được chọn trong admin (Settings →
// Thông tin cửa hàng). Không chọn thì ẩn sidebar.
const sidebarItems = computed(() => {
  if (!aboutCollectionId.value) return []
  return byCollection(aboutCollectionId.value)
    .slice(0, 10)
    .map(p => ({
      key: p.slug,
      to: localePath(`/san-pham/${p.slug}`),
      image: p.image,
      title: p.title,
      subtitle: formatMoney(p.price, p.currencyCode),
    }))
})

const seoDescription = computed(() => stripHtml(aboutHtml.value).slice(0, 160) || site.value.description)
const { toAbsoluteShareImage } = useSeoShareImage()
const shareImage = computed(() => toAbsoluteShareImage(aboutThumbnail.value))

useSeoMeta({
  title: () => title.value,
  description: () => seoDescription.value,
  ogTitle: () => title.value,
  ogDescription: () => seoDescription.value,
  ogImage: () => shareImage.value,
  ogType: 'website',
  twitterCard: 'summary_large_image',
  twitterTitle: () => title.value,
  twitterDescription: () => seoDescription.value,
  twitterImage: () => shareImage.value,
})
</script>

<template>
  <div class="bg-dark min-h-[60vh]">
    <!-- ── Banner (phong cách trang chi tiết bài viết) ── -->
    <!-- -mt-[72px] kéo banner lên dưới header fixed (main có pt-[72px]).
         sticky top-0: banner ghim lại cùng menu khi scroll. -->
    <section ref="bannerEl" class="sticky top-0 z-40 -mt-[72px] bg-dark text-white">
      <div class="relative h-[120px] sm:h-[140px] md:h-[170px] overflow-hidden">
        <img
          v-if="aboutThumbnail"
          :src="aboutThumbnail"
          :alt="title"
          class="absolute inset-0 h-full w-full object-cover"
        >
        <div v-else class="absolute inset-0 bg-gradient-to-br from-primary-800 via-dark-700 to-dark" />
        <div class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/20" />

        <div class="relative h-full container-page flex flex-col items-start justify-end pb-3 md:pb-4">
          <h1 class="font-heading text-lg sm:text-xl md:text-2xl font-bold leading-tight max-w-3xl line-clamp-1">
            {{ title }}
          </h1>
        </div>
      </div>
    </section>

    <!-- ── Article body + sidebar ─────────────────── -->
    <div class="container-page py-10 md:py-16">
      <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-10 xl:gap-14">
        <article class="min-w-0 max-w-3xl">
          <div
            v-if="aboutHtml"
            class="article-body"
            v-html="aboutHtml"
          />
          <div v-else-if="pending" class="space-y-4 animate-pulse">
            <div class="h-4 w-full rounded bg-white/10" />
            <div class="h-4 w-5/6 rounded bg-white/10" />
            <div class="h-4 w-4/6 rounded bg-white/10" />
          </div>
          <p v-else class="text-white/50 italic">{{ t('about.comingSoon') }}</p>
        </article>

        <!-- Sidebar: sản phẩm bộ sưu tập, tự cuộn tuần hoàn từ dưới lên.
             top tính theo cụm ghim: banner + marquee -->
        <aside
          v-if="sidebarItems.length"
          class="lg:sticky lg:top-[220px] lg:self-start"
          :aria-label="t('about.sidebarTitle')"
        >
          <h2 class="mb-4 flex items-center gap-2 font-heading text-lg font-semibold text-white">
            <span class="h-[2px] w-6 bg-primary-400 inline-block flex-none" />
            <span class="truncate">{{ t('about.sidebarTitle') }}</span>
          </h2>

          <WidgetsAutoScrollSidebar :items="sidebarItems" />
        </aside>
      </div>
    </div>
  </div>
</template>

<style scoped>
/*
 * TipTap content styling — đồng bộ với trang chi tiết bài viết
 * (pages/tin-tuc/[slug].vue). :deep() vì HTML render qua v-html.
 */
.article-body {
  @apply text-white/75 leading-[1.85] text-base md:text-lg;
}
.article-body :deep(p) {
  @apply my-5;
}
.article-body :deep(h1),
.article-body :deep(h2) {
  @apply font-heading text-2xl md:text-3xl font-semibold text-white mt-12 mb-4 relative pl-4;
}
.article-body :deep(h1)::before,
.article-body :deep(h2)::before {
  content: '';
  @apply absolute left-0 top-1 bottom-1 w-[4px] rounded-full bg-primary-500;
}
.article-body :deep(h3) {
  @apply font-heading text-xl md:text-2xl font-semibold text-white mt-10 mb-3;
}
.article-body :deep(h4),
.article-body :deep(h5),
.article-body :deep(h6) {
  @apply font-heading text-lg font-semibold text-white mt-8 mb-2;
}
.article-body :deep(a) {
  @apply text-primary-400 underline decoration-primary-400/40 underline-offset-4 transition-colors;
}
.article-body :deep(a:hover) {
  @apply text-primary-300 decoration-primary-300;
}
.article-body :deep(strong) {
  @apply text-white font-semibold;
}
.article-body :deep(blockquote) {
  @apply my-8 border-l-4 border-primary-400 bg-primary-500/10 rounded-r-xl px-6 py-4 italic text-white/80;
}
.article-body :deep(blockquote p) {
  @apply my-0;
}
.article-body :deep(ul),
.article-body :deep(ol) {
  @apply my-5 pl-6 space-y-2;
}
.article-body :deep(ul) {
  @apply list-disc marker:text-primary-400;
}
.article-body :deep(ol) {
  @apply list-decimal marker:text-primary-400 marker:font-semibold;
}
.article-body :deep(img) {
  @apply my-8 w-full rounded-2xl shadow-md shadow-black/30 ring-1 ring-white/10;
}
.article-body :deep(iframe) {
  @apply my-8 rounded-2xl shadow-md shadow-black/30;
}
.article-body :deep(hr) {
  @apply my-10 border-0 h-[2px] bg-gradient-to-r from-transparent via-primary-400/60 to-transparent;
}
.article-body :deep(code) {
  @apply rounded bg-white/10 px-1.5 py-0.5 text-sm text-primary-300;
}
.article-body :deep(pre) {
  @apply my-6 overflow-x-auto rounded-xl bg-black/30 p-5 text-sm text-white/90;
}
.article-body :deep(pre code) {
  @apply bg-transparent p-0 text-inherit;
}
.article-body :deep(mark) {
  @apply bg-primary-400/80 text-dark rounded px-1;
}
.article-body :deep(table) {
  @apply my-6 w-full border-collapse text-sm md:text-base;
}
.article-body :deep(th) {
  @apply bg-primary-500/10 text-white font-semibold border border-primary-400/30 px-4 py-2.5 text-left;
}
.article-body :deep(td) {
  @apply border border-white/10 px-4 py-2.5 bg-white/[0.02] text-white/80;
}
</style>
