<script setup lang="ts">
const { t, locale } = useI18n()
const { site } = useSettings()

const brandName = computed(() => site.value.name || t('site.name'))

useSeoHreflang()

useSeoMeta({
  titleTemplate: (title) => title ? `${title} | ${brandName.value}` : brandName.value,
  ogSiteName: () => brandName.value,
})

useHead({
  htmlAttrs: { lang: locale },
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
