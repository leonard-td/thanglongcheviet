<script setup lang="ts">
import defaultBaseImage from '~/assets/images/tlcv_bg_home_001.jpg'
import defaultLeftImage from '~/assets/images/dau_chim_phuong_nha_ly.png'

const props = withDefaults(defineProps<{
  /** Ảnh nền toàn khung (phần bên phải + vùng dưới) */
  baseImage?: string
  /** Độ blur ảnh nền chung (px), 0 = không blur */
  baseBlur?: number
  /** Ảnh nền khung cột trái */
  leftImage?: string
  /** Độ blur ảnh cột trái (px), 0 = không blur */
  leftBlur?: number
  /** Màu nền dự phòng khi ảnh chưa tải */
  fallbackColor?: string
}>(), {
  baseImage: undefined,
  baseBlur: 0,
  leftImage: undefined,
  leftBlur: 0,
  fallbackColor: '#333',
})

// 2 ảnh nền trang chủ quản lý trong admin (Settings → Thông tin cửa hàng);
// props truyền tay > ảnh cấu hình > ảnh mặc định đóng gói sẵn.
const { heroImages } = useSiteSettings()

const resolvedBaseImage = computed(
  () => props.baseImage ?? heroImages.value[0] ?? defaultBaseImage,
)
const resolvedLeftImage = computed(
  () => props.leftImage ?? heroImages.value[1] ?? defaultLeftImage,
)

const mediaStyle = (image: string, blur: number) => ({
  backgroundImage: `url(${image})`,
  '--bg-blur': blur > 0 ? `${blur}px` : '0px',
})
</script>

<template>
  <div class="home-page-background" :style="{ '--home-bg-fallback': fallbackColor }" aria-hidden="true">
    <!-- Nền chung: phủ toàn viewport (khung bên dưới / phần phải) -->
    <div class="home-page-background__base">
      <div class="home-page-background__media" :class="{ 'is-blurred': baseBlur > 0 }"
        :style="mediaStyle(resolvedBaseImage, baseBlur)" />
      <div class="home-page-background__base-overlay" />
    </div>

    <!-- Khung ảnh riêng, canh đúng cột giữa của `.home-pillars-grid` -->
    <div class="home-page-background__grid">
      <div class="home-page-background__aside">
        <div class="home-page-background__media" :class="{ 'is-blurred': leftBlur > 0 }"
          :style="mediaStyle(resolvedLeftImage, leftBlur)" />
        <div class="home-page-background__aside-overlay" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-page-background {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
  background-color: var(--home-bg-fallback, #333);
}

/* Lớp nền chung — full viewport */
.home-page-background__base {
  position: absolute;
  inset: 0;
}

.home-page-background__base-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg,
      rgba(0, 0, 0, .08) 0%,
      rgba(0, 0, 0, .18) 100%);
  -webkit-backdrop-filter: blur(15px);
  backdrop-filter: blur(15px);
}

/* Lưới soi bóng `.home-pillars-grid` (cộng padding 16px của `.home-pillars-wrap`)
   để khung ảnh nằm trùng khít cột giữa mà không phải tính toạ độ bằng JS.
   Sửa lưới ở `HomeV3PillarList.vue` thì phải sửa cả ở đây. */
.home-page-background__grid {
  --pillar-right-w: calc(346px * 2 + 16px);
  position: absolute;
  inset: 0;
  display: grid;
  /* <1440px lưới bên kia không có cột giữa (xem `.home-pillars-col--center`) nên
     dùng một dải canh giữa rộng xấp xỉ cột giữa tại 1440px. */
  grid-template-columns: 1fr clamp(160px, 22%, 280px) 1fr;
  gap: 24px;
  padding: 0 16px;
}

@media (min-width: 1440px) {
  .home-page-background__grid {
    grid-template-columns:
      minmax(0, 1.4fr)
      minmax(120px, 0.85fr)
      minmax(0, var(--pillar-right-w));
  }
}

/* Khung cột giữa */
.home-page-background__aside {
  position: relative;
  grid-column: 2;
  grid-row: 1;
  overflow: hidden;
  /* border-right: 1px solid rgba(255, 255, 255, .1);
  box-shadow: 4px 0 24px rgba(0, 0, 0, .25); */
}

.home-page-background__aside-overlay {
  position: absolute;
  inset: 0;
  -webkit-backdrop-filter: blur(5px);
  backdrop-filter: blur(5px);
  /* background: linear-gradient(90deg,
      rgba(0, 0, 0, .12) 0%,
      rgba(0, 0, 0, .04) 70%,
      transparent 100%); */
}

/* Ảnh nền dùng chung — scale nhẹ để blur không lộ mép */
.home-page-background__media {
  position: absolute;
  inset: -8px;
  /* background-color: var(--home-bg-fallback, #333); */
  background-repeat: no-repeat;
  background-position: top center;
  background-size: 100% auto;
  transform: scale(1.02);
  transform-origin: center;
}

.home-page-background__base .home-page-background__media {
  background-size: cover;
  background-position: center;
}

.home-page-background__media.is-blurred {
  filter: blur(var(--bg-blur, 0px));
  -webkit-filter: blur(var(--bg-blur, 0px));
}

@media (max-width: 767px) {
  .home-page-background__grid {
    display: none;
  }

  .home-page-background__base-overlay {
    -webkit-backdrop-filter: blur(8px);
    backdrop-filter: blur(8px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .home-page-background__media.is-blurred {
    filter: none;
    -webkit-filter: none;
  }
}
</style>
