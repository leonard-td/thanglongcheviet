import Lenis from 'lenis'

// Smooth scrolling toàn site (quán tính khi lăn chuột/trackpad).
// Là plugin client global -> tự áp dụng cho MỌI trang, kể cả trang phát triển sau.
export default defineNuxtPlugin(() => {
  // Tôn trọng người dùng giảm chuyển động -> dùng cuộn gốc của trình duyệt.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const lenis = new Lenis({
    duration: 1.1,
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  })

  let rafId = 0
  const raf = (time: number) => {
    lenis.raf(time)
    rafId = requestAnimationFrame(raf)
  }
  rafId = requestAnimationFrame(raf)

  // Chuyển trang -> đưa về đầu trang ngay (không "trôi" giữa các route).
  const router = useRouter()
  router.afterEach(() => {
    lenis.scrollTo(0, { immediate: true })
  })

  // Dọn dẹp khi HMR (không có hook Nuxt tương ứng cho "app unmount" thật sự —
  // full page reload/close tự giải phóng mọi thứ).
  const cleanup = () => {
    cancelAnimationFrame(rafId)
    lenis.destroy()
  }
  if (import.meta.hot) import.meta.hot.dispose(cleanup)

  // Cho phép component khác gọi: const { $lenis } = useNuxtApp()
  return { provide: { lenis } }
})
