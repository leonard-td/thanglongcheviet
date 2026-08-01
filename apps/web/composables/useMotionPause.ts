const MOTION_PAUSE_KEY = 'tlcv-motion-paused'

/**
 * Trạng thái "tạm dừng chuyển động" dùng chung cho trang chủ v3.
 *
 * WCAG 2.2.2 (Pause, Stop, Hide) yêu cầu mọi chuyển động tự chạy quá 5s phải có
 * cơ chế dừng. Bản v1 chỉ dừng khi `:hover` — vô dụng trên thiết bị cảm ứng —
 * nên v3 bổ sung một nút bật/tắt thật, trạng thái chia sẻ qua `useState`
 * giữa nút bấm (nằm trong thanh marquee) và wrapper trang (nơi gắn class).
 *
 * Mặc định lần đầu: theo `prefers-reduced-motion` của hệ điều hành; sau đó
 * ưu tiên lựa chọn khách đã lưu (cùng cách làm với `useHomeVersion`).
 */
export function useMotionPause() {
  const paused = useState<boolean>('tlcv-motion-paused', () => false)
  const ready = useState<boolean>('tlcv-motion-paused-ready', () => false)

  // Đọc localStorage/media query sau khi mount để không lệch SSR ↔ hydration,
  // và chỉ một lần dù composable được gọi từ nhiều component.
  if (import.meta.client) {
    onMounted(() => {
      if (ready.value) return
      ready.value = true

      const saved = localStorage.getItem(MOTION_PAUSE_KEY)
      paused.value = saved !== null
        ? saved === '1'
        : window.matchMedia('(prefers-reduced-motion: reduce)').matches
    })
  }

  const toggle = () => {
    paused.value = !paused.value
    if (import.meta.client) {
      localStorage.setItem(MOTION_PAUSE_KEY, paused.value ? '1' : '0')
    }
  }

  return { paused, toggle }
}
