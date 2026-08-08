<script setup lang="ts">
const { t } = useI18n()

useScrollAnimation()

useSeoMeta({
  title: () => t('nav.blogMenu.teaHeritage'),
  description: () => `${t('nav.blogMenu.teaHeritage')} — ${t('blog.comingSoon')}`,
})
</script>

<template>
  <LayoutComingSoonSection :label="t('nav.blog')" :title="t('nav.blogMenu.teaHeritage')" />
</template>
