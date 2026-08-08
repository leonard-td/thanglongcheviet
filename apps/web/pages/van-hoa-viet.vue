<script setup lang="ts">
const { t } = useI18n()

useScrollAnimation()

useSeoMeta({
  title: () => t('nav.blogMenu.tradition'),
  description: () => `${t('nav.blogMenu.tradition')} — ${t('blog.comingSoon')}`,
})
</script>

<template>
  <LayoutComingSoonSection :label="t('nav.blog')" :title="t('nav.blogMenu.tradition')" />
</template>
