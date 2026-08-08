<script setup lang="ts">
const { t } = useI18n()

useScrollAnimation()

useSeoMeta({
  title: () => t('nav.team'),
  description: () => t('team.subtitle'),
})
</script>

<template>
  <div class="bg-dark">
    <LayoutPageHero
      :label="t('team.specialist')"
      :title="t('team.title')"
      :subtitle="t('team.subtitle')"
    />
    <SectionsTeamFull />
  </div>
</template>
