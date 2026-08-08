<script setup lang="ts">
const { t } = useI18n()

useScrollAnimation()

useSeoMeta({
  title: () => t('nav.blogMenu.anQuangGarden'),
  description: () => `${t('nav.blogMenu.anQuangGarden')} — ${t('blog.comingSoon')}`,
})
</script>

<template>
  <LayoutComingSoonSection :label="t('nav.blog')" :title="t('nav.blogMenu.anQuangGarden')" />
</template>
