<script setup lang="ts">
definePageMeta({ layout: false })

// Nền đặt trên lớp fixed riêng (không dùng body background-attachment:fixed)
// để backdrop-filter của widget blur hoạt động đúng trên trang chủ.
useHead({
  style: [
    { innerHTML: `html,body{min-height:100%;margin:0;background:#333;}` },
  ],
})

const { paused } = useMotionPause()
const { t } = useI18n()

const { site } = useSettings()
const { heroImages } = useSiteSettings()

const brandName = computed(() => site.value.name || t('site.name'))
const shareTitle = computed(() => site.value.tagline || brandName.value)
const shareDescription = computed(() => site.value.description || '')

const { toAbsoluteShareImage } = useSeoShareImage()
const shareImage = computed(() =>
  toAbsoluteShareImage(heroImages.value[0] || DEFAULT_SHARE_IMAGE),
)

useSeoMeta({
  title: () => site.value.tagline || undefined,
  description: () => shareDescription.value || undefined,
  ogTitle: () => shareTitle.value,
  ogDescription: () => shareDescription.value || undefined,
  ogImage: () => shareImage.value,
  ogType: 'website',
  twitterCard: 'summary_large_image',
  twitterTitle: () => shareTitle.value,
  twitterDescription: () => shareDescription.value || undefined,
  twitterImage: () => shareImage.value,
})
</script>

<template>
  <div id="wrapper" class="home-page home-page-v3" :class="{ 'motion-paused': paused }">
    <HomePageBackground :base-blur="0" :left-blur="0" />

    <HomeNewsMarquee motion-toggle slow />

    <div class="home-main">
      <HomeMobileTopBanner :base-blur="0" :left-blur="0" />
      <div class="home-pillars-wrap">
        <!-- Nút ngôn ngữ + widget liên hệ nằm trong cột giữa của lưới này -->
        <HomeV3PillarList />
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-page {
  --home-marquee-h: 34px;
  /* Bố cục cũ khai báo 0px trong khi thanh marquee cao thật 34px, khiến offset
     sticky của cột trái sai và cột trái trượt chui xuống dưới thanh. */
  --site-marquee-h: var(--home-marquee-h);
  --home-banner-h: 0px;
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: transparent;
  padding-top: var(--home-marquee-h);
}

.home-main {
  position: relative;
  z-index: 1;
  flex: 1 0 auto;
  display: flow-root;
  padding-top: 24px;
  padding-bottom: 24px;
}

@media (max-width: 1023px) {
  /* Bố cục cũ dùng `clamp(126px, 7vh, 210px)`: 7vh chỉ vượt 126px khi viewport
     cao hơn 1800px, nên trên thực tế luôn dính đúng 126px. Đổi sang 18vh để
     clamp co giãn thật. */
  .home-page {
    --home-banner-h: clamp(120px, 18vh, 200px);
  }

  .home-page :deep(.home-mobile-banner) {
    top: var(--home-marquee-h);
  }

  .home-main {
    padding-top: calc(var(--home-banner-h) + 16px);
  }
}

@media (min-width: 768px) and (max-width: 1023px) {
  .home-page {
    --home-banner-h: clamp(140px, 20vh, 224px);
  }
}

@media (max-width: 639px) {
  .home-page {
    --home-marquee-h: 32px;
  }
}

/* KHÔNG đặt `z-index` ở đây: `z-index: 1` (bản cũ) biến khối này thành một
   stacking context, và banner mobile cố định ở đỉnh có `z-index: 5` nên sẽ đè
   lên TOÀN BỘ cây con — kể cả nút ngôn ngữ `position: fixed; z-index: 1000`
   trong cột giữa, khiến nút biến mất dưới 1024px. `.home-main` bọc ngoài đã có
   `z-index: 1` để nằm trên lớp nền (`z-index: 0`) nên ở đây chỉ cần
   `position: relative` làm containing block cho cột giữa. */
.home-pillars-wrap {
  position: relative;
  max-width: none;
  margin-left: auto;
  margin-right: auto;
  padding-left: 16px;
  padding-right: 16px;
}

@media (max-width: 1023px) {
  .home-pillars-wrap {
    padding-left: 0;
    padding-right: 0;
  }
}
</style>
