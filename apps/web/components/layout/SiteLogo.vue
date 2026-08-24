<script setup lang="ts">
import logoUrl from '~/assets/images/tlcv_logo.png'

const { t } = useI18n()
const localePath = useLocalePath()
const { site } = useSettings()

// Store name comes from admin; the locale string only covers the window
// before site settings resolve.
const label = computed(() => site.value.name || t('site.name'))

withDefaults(defineProps<{
  variant?: 'header' | 'home' | 'marquee'
}>(), {
  variant: 'header',
})
</script>

<template>
  <NuxtLink :to="localePath('/')" class="site-logo" :class="`site-logo--${variant}`" :aria-label="label">
    <img :src="logoUrl" :alt="label" class="site-logo__img" width="120" height="120" decoding="async"
      fetchpriority="high">
  </NuxtLink>
</template>

<style scoped>
.site-logo {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  text-decoration: none;
  line-height: 0;
  background-color: #fff;
  border-radius: 5px;
  padding: 3px;
}

.site-logo__img {
  display: block;
  width: auto;
  height: 100%;
  max-width: 100%;
  object-fit: contain;
}

.site-logo--header {
  height: 44px;
}

@media (min-width: 768px) {
  .site-logo--header {
    height: 48px;
  }
}

.site-logo--home {
  height: clamp(72px, 18vw, 112px);
}

.site-logo--marquee {
  height: 26px;
}

@media (max-width: 639px) {
  .site-logo--marquee {
    height: 24px;
  }
}

.site-logo:hover .site-logo__img {
  filter: brightness(1.06);
}

@media (prefers-reduced-motion: reduce) {
  .site-logo:hover .site-logo__img {
    filter: none;
  }
}
</style>
