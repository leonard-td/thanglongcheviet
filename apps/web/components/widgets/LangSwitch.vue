<script setup lang="ts">
// Language switcher — floating (legacy pages) or in-header (aligned with CTA).
const { locale, locales, setLocale } = useI18n()
const { setOpen, closeEpoch } = useUiOverlay()

const props = withDefaults(defineProps<{
  variant?: 'floating' | 'header'
}>(), {
  variant: 'floating',
})

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
  <div ref="root" class="lang" :class="`lang--${props.variant}`">
    <button
      type="button"
      class="lang-cur"
      :class="{ on: open }"
      :aria-expanded="open"
      aria-haspopup="listbox"
      aria-label="Language / Ngôn ngữ"
      @click="open = !open"
    >
      <span class="code">{{ current?.code?.toUpperCase() }}</span>
      <span class="caret" aria-hidden="true"></span>
    </button>

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
.lang--floating {
  position: fixed;
  top: calc(var(--site-marquee-h, 0px) + 18px);
  right: 18px;
  z-index: 1000;
}

.lang--header {
  position: relative;
  z-index: 10;
  display: inline-flex;
  align-items: center;
  height: 40px;
}

.lang-cur {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  height: 40px;
  padding: 0 12px;
  border: 1px solid rgba(255, 255, 255, .14);
  border-radius: 999px;
  background: rgba(20, 20, 20, .5);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  color: #fff;
  cursor: pointer;
  line-height: 1;
  transition: border-color .25s ease, background .25s ease;
}
.lang--header .lang-cur {
  background: rgba(255, 255, 255, .06);
}
.lang-cur:hover { border-color: rgba(201, 168, 108, .6); }
.lang-cur.on { border-color: #c9a86c; }
.lang-cur .code { font-size: 11px; font-weight: 700; letter-spacing: .12em; }
.lang-cur .caret {
  display: inline-block;
  width: 0;
  height: 0;
  border-left: 3.5px solid transparent;
  border-right: 3.5px solid transparent;
  border-top: 4px solid rgba(255, 255, 255, .6);
  transition: transform .25s ease;
}
.lang-cur.on .caret { transform: rotate(180deg); }

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

.lpop-enter-active, .lpop-leave-active {
  transition: opacity .2s ease, transform .2s cubic-bezier(.22, .61, .36, 1);
}
.lpop-enter-from, .lpop-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(.97);
}

@media (max-width: 480px) {
  .lang--floating { top: 12px; right: 12px; }
}
@media (prefers-reduced-motion: reduce) {
  .lang-cur .caret, .lpop-enter-active, .lpop-leave-active { transition: none; }
}
</style>
