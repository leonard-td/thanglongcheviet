<script setup lang="ts">
// Trang chủ clone từ v2 (theme Modis - "Select Preview").
// CSS trong ~/assets/css, ảnh trong ~/assets/images — build bởi Vite.
// layout: false để render standalone đúng như trang gốc v2.
definePageMeta({ layout: false })

// Nền đặt trên lớp fixed riêng (không dùng body background-attachment:fixed)
// để backdrop-filter của widget blur hoạt động đúng trên trang chủ.
useHead({
  style: [
    { innerHTML: `html,body{min-height:100%;margin:0;background:#333;}` },
  ],
})

// Tablet/mobile: banner + marquee là cụm cố định ở đỉnh. Khi cuộn tới footer,
// đẩy cả cụm lên để đáy cụm luôn nằm TRÊN đỉnh footer (không đè vào footer).
onMounted(() => {
  const mq = window.matchMedia('(max-width: 1023px)')
  const sel = (s: string) => document.querySelector<HTMLElement>(s)
  let banner = sel('.home-mobile-banner')
  let marquee = sel('.home-marquee')
  let footer = sel('.home-footer-wrap')

  const update = () => {
    banner ||= sel('.home-mobile-banner')
    marquee ||= sel('.home-marquee')
    footer ||= sel('.home-footer-wrap')
    if (!banner || !marquee) return

    if (!mq.matches) {
      banner.style.transform = ''
      marquee.style.transform = ''
      return
    }

    if (!footer) return

    const clusterBottom = banner.offsetHeight + marquee.offsetHeight
    const footerTop = footer.getBoundingClientRect().top
    const offset = Math.min(0, footerTop - clusterBottom)
    const tf = offset < 0 ? `translateY(${offset}px)` : ''
    banner.style.transform = tf
    marquee.style.transform = tf
  }

  update()
  window.addEventListener('scroll', update, { passive: true })
  window.addEventListener('resize', update)
  mq.addEventListener('change', update)

  onUnmounted(() => {
    window.removeEventListener('scroll', update)
    window.removeEventListener('resize', update)
    mq.removeEventListener('change', update)
  })
})
</script>

<template>
  <div id="wrapper" class="home-page">
    <HomePageBackground :base-blur="0" :left-blur="0" />

    <HomeNewsMarquee />

    <div class="home-main">
      <HomeMobileTopBanner :base-blur="0" :left-blur="0" />
      <div class="container text-center home-pillars-wrap">
        <div class="row">
          <div class="col-sm-2 col-sm-offset-2" />
          <div class="col-sm-8 col-sm-offset-0">
            <HomePillarList />
          </div>
        </div>
      </div>

    
    </div>
    <WidgetsConnectWidget />
    <!-- <div class="home-footer-wrap">
      <LayoutAppFooter />
    </div> -->
  </div>
</template>

<style scoped>
.home-page {
  --site-marquee-h: 0px;
  --home-marquee-h: 34px;
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
  .home-page {
    --home-banner-h: clamp(126px, 7vh, 210px);
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
    --home-banner-h: clamp(140px, 7vh, 224px);
  }
}

@media (max-width: 639px) {
  .home-page {
    --home-marquee-h: 32px;
  }
}

.home-pillars-wrap {
  position: relative;
  z-index: 1;
}

@media (max-width: 1023px) {
  .home-pillars-wrap.container {
    max-width: none;
    padding-left: 0;
    padding-right: 0;
  }

  .home-pillars-wrap.container :deep(.row) {
    margin-left: 0;
    margin-right: 0;
  }

  .home-pillars-wrap :deep(.col-md-8),
  .home-pillars-wrap :deep([class*="col-md-offset"]) {
    width: 100%;
    float: none;
    margin-left: 0;
    padding-left: 0;
    padding-right: 0;
  }
}

.home-footer-wrap {
  position: relative;
  z-index: 1;
  flex-shrink: 0;
  clear: both;
  margin-top: auto;
}
</style>
