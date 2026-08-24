<script setup lang="ts">
const { locale } = useI18n()
const { site } = useSettings()

useSeoHreflang()

useSeoMeta({
  titleTemplate: (title) => title ? `${title} | ${site.value.name}` : site.value.name,
  ogSiteName: () => site.value.name,
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
