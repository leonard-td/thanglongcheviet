<script setup lang="ts">
// Nút tạm dừng/tiếp tục mọi chuyển động tự chạy của trang chủ v3.
// Đặt trong thanh marquee (cao 34px) nên nút lấp đầy chiều cao thanh và rộng
// tối thiểu 40px — vượt ngưỡng 24×24px của WCAG 2.5.8; không thể đạt 44px
// (mức AAA) vì bị giới hạn bởi chiều cao thanh.
const { paused, toggle } = useMotionPause()
const { t } = useI18n()

const label = computed(() => t(paused.value ? 'motion.resume' : 'motion.pause'))
</script>

<template>
  <button
    type="button"
    class="motion-toggle"
    :class="{ 'is-paused': paused }"
    :aria-pressed="paused"
    :aria-label="label"
    :title="label"
    @click="toggle"
  >
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path v-if="paused" d="M8 5.5v13l11-6.5z" />
      <template v-else>
        <rect x="8" y="5.5" width="3.2" height="13" rx="1" />
        <rect x="13.8" y="5.5" width="3.2" height="13" rx="1" />
      </template>
    </svg>
  </button>
</template>

<style scoped>
.motion-toggle {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-width: 40px;
  padding: 0 10px;
  border: 0;
  border-left: 1px solid rgba(255, 255, 255, .18);
  background: transparent;
  color: rgba(255, 255, 255, .78);
  cursor: pointer;
  transition: background .2s ease, color .2s ease;
}

.motion-toggle:hover {
  background: rgba(255, 255, 255, .1);
  color: #fff;
}

.motion-toggle.is-paused {
  color: #99b521;
}

.motion-toggle svg {
  width: 15px;
  height: 15px;
  fill: currentColor;
}

.motion-toggle:focus-visible {
  outline: 2px solid #fff;
  outline-offset: -3px;
}
</style>
