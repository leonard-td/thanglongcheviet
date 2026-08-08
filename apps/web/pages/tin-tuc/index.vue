<script setup lang="ts">
const { t } = useI18n()

useScrollAnimation()

useSeoMeta({
  title: () => t('nav.blog'),
  description: () => t('blog.subtitle'),
})
</script>

<template>
  <div class="bg-dark">
    <LayoutPageHero
      :label="t('blog.eyebrow')"
      :title="t('blog.title')"
      :subtitle="t('blog.subtitle')"
    />
    <SectionsBlogTopics />
    <SectionsBlogList />
  </div>
</template>
