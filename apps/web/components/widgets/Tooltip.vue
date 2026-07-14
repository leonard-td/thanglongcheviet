<script setup lang="ts">
// Tooltip tự chứa (không dùng thuộc tính `title` mặc định của trình duyệt).
// Bọc quanh phần tử kích hoạt (icon, nút...) — hiện khi hover HOẶC focus
// (bàn phím/trình đọc màn hình), tự ẩn khi rời chuột/blur.
withDefaults(defineProps<{
  text: string
  placement?: 'top' | 'bottom' | 'left' | 'right'
  /** Cho phép nội dung dài xuống dòng (mặc định bubble 1 dòng nowrap). */
  multiline?: boolean
}>(), {
  placement: 'top',
  multiline: false,
})
</script>

<template>
  <span class="tt-wrap">
    <slot />
    <span class="tt-bubble" :class="[`tt-${placement}`, { 'tt-multiline': multiline }]" role="tooltip">
      {{ text }}
    </span>
  </span>
</template>

<style scoped>
.tt-wrap {
  position: relative;
  display: inline-flex;
}

.tt-bubble {
  position: absolute;
  z-index: 60;
  white-space: nowrap;
  background: #1f1f1f;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: .02em;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, .1);
  box-shadow: 0 6px 18px rgba(0, 0, 0, .4);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity .16s ease, transform .16s ease, visibility .16s;
}

.tt-multiline {
  white-space: normal;
  width: max-content;
  max-width: min(280px, 80vw);
  text-align: left;
  line-height: 1.4;
}

.tt-bubble::before {
  content: "";
  position: absolute;
  width: 0;
  height: 0;
  border: 5px solid transparent;
}

/* Vị trí + hướng mũi tên theo từng placement */
.tt-top {
  bottom: calc(100% + 9px);
  left: 50%;
  transform: translate(-50%, 4px) scale(.94);
}
.tt-top::before {
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border-top-color: #1f1f1f;
}

.tt-bottom {
  top: calc(100% + 9px);
  left: 50%;
  transform: translate(-50%, -4px) scale(.94);
}
.tt-bottom::before {
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  border-bottom-color: #1f1f1f;
}

.tt-left {
  right: calc(100% + 9px);
  top: 50%;
  transform: translate(4px, -50%) scale(.94);
}
.tt-left::before {
  left: 100%;
  top: 50%;
  transform: translateY(-50%);
  border-left-color: #1f1f1f;
}

.tt-right {
  left: calc(100% + 9px);
  top: 50%;
  transform: translate(-4px, -50%) scale(.94);
}
.tt-right::before {
  right: 100%;
  top: 50%;
  transform: translateY(-50%);
  border-right-color: #1f1f1f;
}

.tt-wrap:hover .tt-bubble,
.tt-wrap:focus-within .tt-bubble {
  opacity: 1;
  visibility: visible;
}
.tt-wrap:hover .tt-top,
.tt-wrap:focus-within .tt-top {
  transform: translate(-50%, 0) scale(1);
}
.tt-wrap:hover .tt-bottom,
.tt-wrap:focus-within .tt-bottom {
  transform: translate(-50%, 0) scale(1);
}
.tt-wrap:hover .tt-left,
.tt-wrap:focus-within .tt-left {
  transform: translate(0, -50%) scale(1);
}
.tt-wrap:hover .tt-right,
.tt-wrap:focus-within .tt-right {
  transform: translate(0, -50%) scale(1);
}

@media (prefers-reduced-motion: reduce) {
  .tt-bubble {
    transition: opacity .16s ease, visibility .16s;
  }
}
</style>
