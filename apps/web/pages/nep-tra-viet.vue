<script setup lang="ts">
const { t } = useI18n()

useScrollAnimation()

useSeoMeta({
  title: () => t('nav.blogMenu.vietTea'),
  description: () => `${t('nav.blogMenu.vietTea')} — ${t('blog.comingSoon')}`,
})
</script>

<template>
  <LayoutComingSoonSection :label="t('nav.blog')" :title="t('nav.blogMenu.vietTea')" />
</template>
