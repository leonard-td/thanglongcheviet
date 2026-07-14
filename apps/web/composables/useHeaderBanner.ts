/**
 * Điều phối nền của site-header với các trang có banner full-bleed.
 *
 * Header luôn `fixed` và trong suốt ở đầu trang, chuyển nền đặc khi scroll
 * quá một ngưỡng. Mặc định ngưỡng là 50px; trang có banner gọi
 * `useBannerHeader(bannerRef)` để nâng ngưỡng lên bằng chiều cao banner —
 * header nằm đè trong suốt trên banner và chỉ chuyển đặc khi banner đã
 * scroll hết qua. AppHeader tự reset ngưỡng về mặc định mỗi lần đổi route.
 *
 * Trang dùng banner nhớ thêm class `-mt-[72px]` cho section banner để kéo
 * banner lên dưới header (layout mặc định chừa sẵn `pt-[72px]` cho <main>).
 */
export const HEADER_HEIGHT = 72
export const DEFAULT_HEADER_SOLID_THRESHOLD = 50

export const useHeaderSolidThreshold = () =>
  useState<number>('header-solid-threshold', () => DEFAULT_HEADER_SOLID_THRESHOLD)

export const useBannerHeader = (banner: Ref<HTMLElement | null>) => {
  const threshold = useHeaderSolidThreshold()
  const route = useRoute()

  const measure = () => {
    if (banner.value) {
      threshold.value = Math.max(0, banner.value.offsetHeight - HEADER_HEIGHT)
    }
  }

  onMounted(() => {
    measure()
    window.addEventListener('resize', measure)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('resize', measure)
  })

  // banner render lại khi data về (v-if theo pending) — đo lại cho chắc
  watch(banner, () => measure())

  // Điều hướng giữa 2 trang dùng chung component (vd. bài viết → bài viết):
  // AppHeader đã reset ngưỡng về mặc định nhưng ref banner không đổi,
  // nên phải đo lại sau khi DOM cập nhật.
  watch(() => route.fullPath, () => nextTick(measure))
}
