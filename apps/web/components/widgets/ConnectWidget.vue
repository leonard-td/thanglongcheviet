<script setup lang="ts">
// Cột icon kênh liên lạc (Zalo, Facebook, Instagram) hiện thường trực, cố định
// góc dưới bên trái — không cần bấm gì để thấy. Nút FAB bên dưới chỉ dùng để
// mở form "Để lại thông tin".
const props = withDefaults(defineProps<{
  /**
   * Nằm trong cột giữa trang chủ: bỏ `position: fixed` của chính widget để
   * wrapper `.home-center-dock` (sticky) lo việc ghim đáy màn hình, còn dải
   * icon vẫn nằm NGANG như mặc định. Cột giữa chỉ có chỗ từ 1440px nên biến
   * thể này cũng chỉ đổi vị trí từ ngưỡng đó.
   */
  inline?: boolean
}>(), {
  inline: false,
})

const { t } = useI18n()
const { social } = useSettings()
const { setOpen, closeEpoch } = useUiOverlay()
// Trang chi tiết sản phẩm hiện "Thanh mua nhanh cố định" ở đáy màn hình —
// dịch widget lên trên để không bị thanh đó che khuất.
const { active: quickBuyBarActive } = useQuickBuyBar()

const open = ref(false)
const root = ref<HTMLElement | null>(null)

// đóng khi bấm ra ngoài / nhấn Esc
onClickOutside(root, () => { open.value = false })
onKeyStroke('Escape', () => { open.value = false })

// đồng bộ backdrop làm mờ toàn trang
watch(open, (v) => setOpen('connect', v))
watch(closeEpoch, () => { open.value = false })
onUnmounted(() => setOpen('connect', false))

interface Channel { key: string; label: string; href: string; color: string }
const channels = computed<Channel[]>(() => [
  { key: 'zalo', label: 'Zalo', href: social.value.zalo, color: '#0068FF' },
  { key: 'facebook', label: 'Facebook', href: social.value.facebook, color: '#1877F2' },
  { key: 'instagram', label: 'Instagram', href: social.value.instagram, color: '#E4405F' },
])

// Icon SVG nội tuyến (tự chứa, không phụ thuộc thư viện icon)
const icons: Record<string, string> = {
  zalo: `<svg width="50" height="50" viewBox="0 0 50 50" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M22.782 0.166016H27.199C33.2653 0.166016 36.8103 1.05701 39.9572 2.74421C43.1041 4.4314 45.5875 6.89585 47.2557 10.0428C48.9429 13.1897 49.8339 16.7347 49.8339 22.801V27.1991C49.8339 33.2654 48.9429 36.8104 47.2557 39.9573C45.5685 43.1042 43.1041 45.5877 39.9572 47.2559C36.8103 48.9431 33.2653 49.8341 27.199 49.8341H22.8009C16.7346 49.8341 13.1896 48.9431 10.0427 47.2559C6.89583 45.5687 4.41243 43.1042 2.7442 39.9573C1.057 36.8104 0.166016 33.2654 0.166016 27.1991V22.801C0.166016 16.7347 1.057 13.1897 2.7442 10.0428C4.43139 6.89585 6.89583 4.41245 10.0427 2.74421C13.1707 1.05701 16.7346 0.166016 22.782 0.166016Z" fill="#0068FF"/>
<path opacity="0.12" fill-rule="evenodd" clip-rule="evenodd" d="M49.8336 26.4736V27.1994C49.8336 33.2657 48.9427 36.8107 47.2555 39.9576C45.5683 43.1045 43.1038 45.5879 39.9569 47.2562C36.81 48.9434 33.265 49.8344 27.1987 49.8344H22.8007C17.8369 49.8344 14.5612 49.2378 11.8104 48.0966L7.27539 43.4267L49.8336 26.4736Z" fill="#001A33"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M7.779 43.5892C10.1019 43.846 13.0061 43.1836 15.0682 42.1825C24.0225 47.1318 38.0197 46.8954 46.4923 41.4732C46.8209 40.9803 47.1279 40.4677 47.4128 39.9363C49.1062 36.7779 50.0004 33.22 50.0004 27.1316V22.7175C50.0004 16.629 49.1062 13.0711 47.4128 9.91273C45.7385 6.75436 43.2461 4.28093 40.0877 2.58758C36.9293 0.894239 33.3714 0 27.283 0H22.8499C17.6644 0 14.2982 0.652754 11.4699 1.89893C11.3153 2.03737 11.1636 2.17818 11.0151 2.32135C2.71734 10.3203 2.08658 27.6593 9.12279 37.0782C9.13064 37.0921 9.13933 37.1061 9.14889 37.1203C10.2334 38.7185 9.18694 41.5154 7.55068 43.1516C7.28431 43.399 7.37944 43.5512 7.779 43.5892Z" fill="white"/>
<path d="M20.5632 17H10.8382V19.0853H17.5869L10.9329 27.3317C10.7244 27.635 10.5728 27.9194 10.5728 28.5639V29.0947H19.748C20.203 29.0947 20.5822 28.7156 20.5822 28.2606V27.1421H13.4922L19.748 19.2938C19.8428 19.1801 20.0134 18.9716 20.0893 18.8768L20.1272 18.8199C20.4874 18.2891 20.5632 17.8341 20.5632 17.2844V17Z" fill="#0068FF"/>
<path d="M32.9416 29.0947H34.3255V17H32.2402V28.3933C32.2402 28.7725 32.5435 29.0947 32.9416 29.0947Z" fill="#0068FF"/>
<path d="M25.814 19.6924C23.1979 19.6924 21.0747 21.8156 21.0747 24.4317C21.0747 27.0478 23.1979 29.171 25.814 29.171C28.4301 29.171 30.5533 27.0478 30.5533 24.4317C30.5723 21.8156 28.4491 19.6924 25.814 19.6924ZM25.814 27.2184C24.2785 27.2184 23.0273 25.9672 23.0273 24.4317C23.0273 22.8962 24.2785 21.645 25.814 21.645C27.3495 21.645 28.6007 22.8962 28.6007 24.4317C28.6007 25.9672 27.3685 27.2184 25.814 27.2184Z" fill="#0068FF"/>
<path d="M40.4867 19.6162C37.8516 19.6162 35.7095 21.7584 35.7095 24.3934C35.7095 27.0285 37.8516 29.1707 40.4867 29.1707C43.1217 29.1707 45.2639 27.0285 45.2639 24.3934C45.2639 21.7584 43.1217 19.6162 40.4867 19.6162ZM40.4867 27.2181C38.9322 27.2181 37.681 25.9669 37.681 24.4124C37.681 22.8579 38.9322 21.6067 40.4867 21.6067C42.0412 21.6067 43.2924 22.8579 43.2924 24.4124C43.2924 25.9669 42.0412 27.2181 40.4867 27.2181Z" fill="#0068FF"/>
<path d="M29.4562 29.0944H30.5747V19.957H28.6221V28.2793C28.6221 28.7153 29.0012 29.0944 29.4562 29.0944Z" fill="#0068FF"/></svg>`,
  facebook: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.52 1.49-3.92 3.78-3.92 1.1 0 2.24.2 2.24.2v2.47h-1.26c-1.24 0-1.63.78-1.63 1.57v1.89h2.78l-.44 2.9h-2.34V22c4.78-.79 8.44-4.94 8.44-9.94z"/></svg>',
  instagram: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16zm0 3.24A6.6 6.6 0 1 0 18.6 12 6.6 6.6 0 0 0 12 5.4zm0 10.89A4.29 4.29 0 1 1 16.29 12 4.29 4.29 0 0 1 12 16.29zm6.85-11.15a1.54 1.54 0 1 1-1.54-1.54 1.54 1.54 0 0 1 1.54 1.54z"/></svg>',
}

const { submitContact } = useContact()

// ── Form để lại thông tin ──
const form = reactive({ name: '', phone: '', email: '', message: '' })
const status = ref<'idle' | 'submitting' | 'success' | 'error'>('idle')

async function submit() {
  if (!form.name || !form.phone) return
  status.value = 'submitting'
  const res = await submitContact({
    name: form.name,
    phone: form.phone,
    email: form.email,
    message: form.message,
    source: 'connect-widget',
  })
  status.value = res.success ? 'success' : 'error'
  if (res.success) {
    setTimeout(() => {
      status.value = 'idle'
      form.name = form.phone = form.email = form.message = ''
      open.value = false
    }, 4000)
  }
}
</script>

<template>
  <div
    ref="root"
    class="connect"
    :class="{ 'above-buybar': quickBuyBarActive, 'is-inline': props.inline }"
  >
    <!-- Panel: chỉ còn form "Để lại thông tin" -->
    <Transition name="cpop">
      <div v-if="open" class="panel" role="dialog" :aria-label="t('connect.leaveInfo')">
        <div class="panel-head">
          <div>
            <p class="panel-title">{{ t('connect.leaveInfo') }}</p>
            <p class="panel-sub">{{ t('connect.leaveInfoSubtitle') }}</p>
          </div>
          <button type="button" class="x" :aria-label="t('common.close')" @click="open = false">✕</button>
        </div>

        <form class="cform" @submit.prevent="submit">
          <template v-if="status === 'success'">
            <p class="ok">{{ t('contact.form.success') }}</p>
          </template>
          <template v-else>
            <input v-model="form.name" type="text" class="fin" :placeholder="t('contact.form.name')" required>
            <input v-model="form.phone" type="tel" class="fin" :placeholder="t('contact.form.phone')" required>
            <input v-model="form.email" type="email" class="fin" :placeholder="t('contact.form.email')">
            <textarea v-model="form.message" class="fin" rows="2" :placeholder="t('contact.form.messagePlaceholder')" />
            <button type="submit" class="send" :disabled="status === 'submitting'">
              {{ status === 'submitting' ? t('contact.form.submitting') : t('contact.form.submit') }}
            </button>
          </template>
        </form>
      </div>
    </Transition>

    <!-- Hàng ngang: FAB (ngoài cùng bên trái) + icon kênh liên lạc (luôn hiện) -->
    <div class="dock">
      <WidgetsTooltip :text="t('connect.leaveInfo')" placement="top">
        <button type="button" class="fab" :class="{ on: open }" :aria-expanded="open" :aria-label="t('connect.leaveInfo')"
          @click="open = !open">
          <svg v-if="!open" viewBox="0 0 24 24" fill="currentColor" class="fab-ic">
            <path
              d="M6.6 10.8a15.5 15.5 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.24 11.4 11.4 0 0 0 3.6.58 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.4 11.4 0 0 0 .58 3.6 1 1 0 0 1-.25 1z" />
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="currentColor" class="fab-ic">
            <path
              d="M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.3 19.7 2.89 18.3 9.18 12 2.89 5.71 4.3 4.29l6.29 6.3 6.3-6.3z" />
          </svg>
        </button>
      </WidgetsTooltip>

      <WidgetsTooltip v-for="c in channels" :key="c.key" :text="c.label" placement="top">
        <a
          :href="c.href"
          target="_blank"
          rel="noopener"
          class="chan-icon"
          :style="{ background: c.color }"
          :aria-label="c.label"
        >
          <span v-html="icons[c.key]" />
        </a>
      </WidgetsTooltip>
    </div>
  </div>
</template>

<style scoped>
.connect {
  position: fixed;
  left: 20px;
  bottom: 20px;
  z-index: 1000;
  transition: bottom .25s ease;
}

/* Thanh mua nhanh cố định (trang chi tiết sản phẩm) cao ~64px — dịch widget
   lên trên nó thay vì để đè lên nhau. Hai class gộp lại (specificity cao hơn
   .connect một mình) nên thắng cả rule mobile bên dưới. */
.connect.above-buybar {
  bottom: 88px;
}

/* ── Hàng ngang: FAB ngoài cùng bên trái + icon kênh liên lạc luôn hiện ── */
.dock {
  display: flex;
  align-items: center;
  gap: 10px;
}

.chan-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  border-radius: 50%;
  color: #fff;
  flex-shrink: 0;
  text-decoration: none;
  box-shadow: 0 6px 16px rgba(0, 0, 0, .3);
  transition: transform .2s cubic-bezier(.22, .61, .36, 1), box-shadow .2s ease;
}

.chan-icon :deep(svg) {
  width: 21px;
  height: 21px;
}

.chan-icon:hover,
.chan-icon:focus-visible {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, .4);
}

/* ── FAB: chỉ icon, tròn — mở form "Để lại thông tin" ── */
.fab {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 54px;
  height: 54px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: #a01f25;
  color: #fff;
  cursor: pointer;
  box-shadow:
    0 8px 22px rgba(0, 0, 0, .35),
    0 0 0 1px rgba(255, 255, 255, .08) inset,
    0 0 0 0 rgba(196, 30, 58, 0),
    0 0 0 0 rgba(77, 124, 58, 0);
  transition: transform .3s cubic-bezier(.22, .61, .36, 1), background .3s ease, box-shadow .3s ease;
  border: 1px solid rgba(255, 255, 255, .15);
  animation: fab-heartbeat 0.9s cubic-bezier(.45, .05, .55, .95) infinite;
}

/* Animation giống nhịp tim + điện thoại reo - chu kỳ 0.9s */
@keyframes fab-heartbeat {
  0% {
    transform: rotate(0deg) scale(1);
    box-shadow:
      0 8px 22px rgba(0, 0, 0, .35),
      0 0 0 1px rgba(255, 255, 255, .08) inset,
      0 0 0 0 rgba(196, 30, 58, 0),
      0 0 0 0 rgba(77, 124, 58, 0);
  }

  /* Nhịp 1: lắc mạnh */
  8% {
    transform: rotate(-10deg) scale(1.04);
  }
  12% {
    transform: rotate(10deg) scale(1.06);
    box-shadow:
      0 10px 26px rgba(0, 0, 0, .42),
      0 0 0 1px rgba(255, 255, 255, .15) inset,
      0 0 22px 4px rgba(196, 30, 58, .75),
      0 0 32px 6px rgba(77, 124, 58, .55);
  }
  16% {
    transform: rotate(-8deg) scale(1.05);
  }

  /* Nhịp 2: lắc nhẹ hơn */
  20% {
    transform: rotate(6deg) scale(1.03);
  }
  24% {
    transform: rotate(-4deg) scale(1.02);
  }
  28% {
    transform: rotate(0deg) scale(1.01);
    box-shadow:
      0 12px 28px rgba(0, 0, 0, .45),
      0 0 0 1px rgba(255, 255, 255, .18) inset,
      0 0 26px 5px rgba(196, 30, 58, .85),
      0 0 38px 8px rgba(77, 124, 58, .65);
  }

  /* Fade out ánh sáng */
  35% {
    transform: rotate(0deg) scale(1);
    box-shadow:
      0 10px 24px rgba(0, 0, 0, .38),
      0 0 0 1px rgba(255, 255, 255, .1) inset,
      0 0 14px 2px rgba(196, 30, 58, .4),
      0 0 20px 3px rgba(77, 124, 58, .3);
  }

  45%, 100% {
    transform: rotate(0deg) scale(1);
    box-shadow:
      0 8px 22px rgba(0, 0, 0, .35),
      0 0 0 1px rgba(255, 255, 255, .08) inset,
      0 0 0 0 rgba(196, 30, 58, 0),
      0 0 0 0 rgba(77, 124, 58, 0);
  }
}

.fab:hover {
  animation-play-state: paused;
  transform: translateY(-2px) scale(1.05);
  box-shadow:
    0 12px 28px rgba(0, 0, 0, .45),
    0 0 0 1px rgba(255, 255, 255, .15) inset,
    0 0 20px 4px rgba(196, 30, 58, .7),
    0 0 32px 6px rgba(77, 124, 58, .5);
}

.fab.on {
  background: #2d2d2d;
  color: #fff;
}

.fab-ic {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}

/* ── Panel (form) ── */
.panel {
  position: absolute;
  left: 0;
  bottom: calc(100% + 14px);
  width: 280px;
  max-width: calc(100vw - 40px);
  background: #1f1f1f;
  border: 1px solid rgba(255, 255, 255, .1);
  border-radius: 16px;
  box-shadow: 0 18px 50px rgba(0, 0, 0, .55);
  overflow: hidden;
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  padding: 16px 16px 12px;
  background: linear-gradient(135deg, rgba(201, 168, 108, .16), transparent);
  border-bottom: 1px solid rgba(255, 255, 255, .07);
}

.panel-title {
  color: #fff;
  font-size: 15px;
  font-weight: 700;
}

.panel-sub {
  color: rgba(255, 255, 255, .5);
  font-size: 12px;
  margin-top: 2px;
}

.x {
  border: 0;
  background: transparent;
  color: rgba(255, 255, 255, .5);
  font-size: 14px;
  cursor: pointer;
  line-height: 1;
  padding: 2px 4px;
}

.x:hover {
  color: #fff;
}

/* ── Form ── */
.cform {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
}

.fin {
  width: 100%;
  background: #161616;
  border: 1px solid rgba(255, 255, 255, .12);
  border-radius: 8px;
  color: #fff;
  font-size: 13px;
  padding: 9px 11px;
  outline: none;
  transition: border-color .2s ease;
  resize: none;
}

.fin:focus {
  border-color: #c9a86c;
}

.fin::placeholder {
  color: rgba(255, 255, 255, .38);
}

.send {
  margin-top: 2px;
  border: 0;
  border-radius: 8px;
  background: #c9a86c;
  color: #1a1a1a;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: .03em;
  padding: 10px;
  cursor: pointer;
  transition: background .2s ease;
}

.send:hover {
  background: #b8903a;
}

.send:disabled {
  opacity: .6;
  cursor: default;
}

.ok {
  color: #7fb843;
  font-size: 13px;
  text-align: center;
  padding: 14px 6px;
  line-height: 1.5;
}

/* ── Transition panel ── */
.cpop-enter-active,
.cpop-leave-active {
  transition: opacity .25s ease, transform .25s cubic-bezier(.22, .61, .36, 1);
}

.cpop-enter-from,
.cpop-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(.97);
}

/* ── Biến thể inline: nằm trong cột giữa trang chủ ──
   Giữ nguyên dải icon nằm ngang và form mở lên trên; chỉ nhả `position: fixed`
   để wrapper sticky của cột giữa quyết định vị trí ngang. Cột giữa chỉ được
   cấp chỗ từ 1440px (xem `HomeV3PillarList`), hẹp hơn thì widget vẫn nổi ở góc
   dưới bên trái như mọi trang khác. */
@media (min-width: 1440px) {
  .connect.is-inline,
  .connect.is-inline.above-buybar {
    position: relative;
    left: auto;
    bottom: auto;
  }

  /* Panel rộng 280px, dải icon ~222px -> canh giữa dải thay vì căn mép trái.
     `margin-left` chứ không `transform`, vì transform sẽ đè transition .cpop. */
  .connect.is-inline .panel {
    left: 50%;
    margin-left: -140px;
  }
}

@media (max-width: 480px) {
  .connect {
    left: 12px;
    bottom: 12px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .fab,
  .cpop-enter-active,
  .cpop-leave-active {
    transition: none;
  }
}
</style>
