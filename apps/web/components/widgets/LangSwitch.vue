<script setup lang="ts">
// Nút chuyển ngôn ngữ — cố định góc trên bên phải.
// Hiện icon quả địa cầu + tên đầy đủ ngôn ngữ đang chọn; bấm để mở danh sách.
const props = withDefaults(defineProps<{
  /**
   * Nằm trong luồng trang (cột giữa trang chủ) thay vì ghim góc trên phải.
   * Cột giữa chỉ có chỗ từ 1440px nên biến thể này cũng chỉ đổi vị trí từ
   * ngưỡng đó — hẹp hơn thì nút vẫn ghim ở góc như trên mọi trang khác.
   */
  inline?: boolean
}>(), {
  inline: false,
})

const { t, locale, locales, setLocale } = useI18n()
const { setOpen, closeEpoch } = useUiOverlay()

const open = ref(false)
const root = ref<HTMLElement | null>(null)

const current = computed(() => locales.value.find(l => l.code === locale.value))

onClickOutside(root, () => { open.value = false })
onKeyStroke('Escape', () => { open.value = false })
watch(open, v => setOpen('lang', v))
watch(closeEpoch, () => { open.value = false })
onUnmounted(() => setOpen('lang', false))

function choose(code: string) {
  if (code !== locale.value) setLocale(code as 'vi' | 'en')
  open.value = false
}
</script>

<template>
  <div ref="root" class="lang" :class="{ 'is-inline': props.inline }">
    <!-- Nút hiện ngôn ngữ đang chọn -->
    <button
      type="button"
      class="lang-cur"
      :class="{ on: open }"
      :aria-expanded="open"
      aria-haspopup="listbox"
      :aria-label="t('lang.switch')"
      @click="open = !open"
    >
      <svg class="globe" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18" />
        <path d="M12 3c2.6 2.7 2.6 15.3 0 18-2.6-2.7-2.6-15.3 0-18z" />
      </svg>
      <span class="name">{{ current?.name ?? current?.code?.toUpperCase() }}</span>
      <svg class="caret" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="m6 9.5 6 6 6-6" />
      </svg>
    </button>

    <!-- Danh sách ngôn ngữ -->
    <Transition name="lpop">
      <ul v-if="open" class="lang-menu" role="listbox">
        <li v-for="l in locales" :key="l.code">
          <button
            type="button"
            class="lang-item"
            :class="{ active: l.code === locale }"
            role="option"
            :aria-selected="l.code === locale"
            @click="choose(l.code)"
          >
            <span class="ci-code">{{ l.code.toUpperCase() }}</span>
            <span class="ci-name">{{ l.name }}</span>
          </button>
        </li>
      </ul>
    </Transition>
  </div>
</template>

<style scoped>
.lang {
  position: fixed;
  top: calc(var(--site-marquee-h, 0px) + 18px);
  right: 18px;
  z-index: 1000;
}

/* Nút hiện ngôn ngữ hiện tại */
.lang-cur {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 11px;
  border: 1px solid rgba(255, 255, 255, .14);
  border-radius: 999px;
  background: rgba(20, 20, 20, .5);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  color: #fff;
  cursor: pointer;
  transition: border-color .25s ease, background .25s ease;
}
.lang-cur:hover { border-color: rgba(201, 168, 108, .6); }
.lang-cur.on { border-color: #c9a86c; }
.lang-cur .globe {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
  fill: none;
  stroke: #c9a86c;
  stroke-width: 1.6;
  stroke-linecap: round;
}
/* Tên đầy đủ ("Tiếng Việt" / "English") thay cho mã 2 ký tự — khách thấy ngay
   mình đang ở ngôn ngữ nào mà không phải giải mã "VI". */
.lang-cur .name {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: .02em;
  white-space: nowrap;
}
.lang-cur .caret {
  width: 11px;
  height: 11px;
  flex-shrink: 0;
  fill: none;
  stroke: rgba(255, 255, 255, .6);
  stroke-width: 2;
  stroke-linecap: round;
  transition: transform .25s ease;
}
.lang-cur.on .caret { transform: rotate(180deg); }

/* Danh sách */
.lang-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 140px;
  margin: 0;
  padding: 5px;
  list-style: none;
  background: #1f1f1f;
  border: 1px solid rgba(255, 255, 255, .1);
  border-radius: 12px;
  box-shadow: 0 14px 36px rgba(0, 0, 0, .5);
}
.lang-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 11px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: rgba(255, 255, 255, .75);
  cursor: pointer;
  text-align: left;
  transition: background .2s ease, color .2s ease;
}
.lang-item:hover { background: rgba(255, 255, 255, .06); color: #fff; }
.lang-item.active { color: #c9a86c; }
.ci-code {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .1em;
  min-width: 22px;
}
.ci-name { font-size: 13px; }

/* Transition */
.lpop-enter-active, .lpop-leave-active {
  transition: opacity .2s ease, transform .2s cubic-bezier(.22, .61, .36, 1);
}
.lpop-enter-from, .lpop-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(.97);
}

/* ── Biến thể inline: nằm trong cột giữa trang chủ ──
   Cột giữa chỉ được cấp chỗ từ 1440px (xem `HomeV3PillarList`), nên dưới ngưỡng
   đó giữ nguyên vị trí fixed góc trên phải. */
@media (min-width: 1440px) {
  .lang.is-inline {
    position: relative;
    top: auto;
    right: auto;
  }

  /* Cột giữa hẹp: neo menu vào giữa nút thay vì mép phải để không tràn ra
     ngoài cột. */
  .lang.is-inline .lang-menu {
    right: auto;
    left: 50%;
    transform: translateX(-50%);
  }

  .lang.is-inline .lpop-enter-from,
  .lang.is-inline .lpop-leave-to {
    transform: translateX(-50%) translateY(-8px) scale(.97);
  }
}

/* Trước đây nút nằm TRONG thanh marquee của trang chủ nên có thể đè lên thanh
   (top: 12px). Giờ nút thuộc `.home-main` (z-index thấp hơn thanh marquee) nên
   phải đặt hẳn xuống dưới thanh, không thì bị thanh che mất. */
@media (max-width: 480px) {
  .lang {
    top: calc(var(--site-marquee-h, 0px) + 12px);
    right: 12px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .lang-cur .caret, .lpop-enter-active, .lpop-leave-active { transition: none; }
}
</style>
