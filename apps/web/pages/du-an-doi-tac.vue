<script setup lang="ts">
const { t } = useI18n()

useScrollAnimation()

useSeoMeta({
  title: () => t('nav.projectsPartners'),
  description: () => `${t('nav.projectsPartners')} — ${t('blog.comingSoon')}`,
})
</script>

<template>
  <LayoutComingSoonSection :label="t('nav.projectsPartners')" :title="t('nav.projectsPartners')" />
</template>
