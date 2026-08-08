<script setup lang="ts">
const { t } = useI18n()

useScrollAnimation()

useSeoMeta({
  title: () => t('nav.contact'),
  description: () => t('contact.subtitle'),
})
</script>

<template>
  <div>
    <LayoutPageHero
      :label="t('nav.contact')"
      :title="t('contact.title')"
      :subtitle="t('contact.subtitle')"
    />
    <SectionsContactSection />
  </div>
</template>
