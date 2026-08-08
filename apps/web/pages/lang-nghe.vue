<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()

useScrollAnimation()

const valueKeys = ['heritage', 'craft', 'origin', 'community'] as const

useSeoMeta({
  title: () => t('nav.craftVillage'),
  description: () => t('craftVillage.subtitle'),
})
</script>

<template>
  <div class="bg-dark">
    <LayoutPageHero
      :label="t('craftVillage.eyebrow')"
      :title="t('craftVillage.title')"
      :subtitle="t('craftVillage.subtitle')"
    />
    <section class="section-py bg-dark-800 text-white">
      <div class="container-page max-w-3xl animate-on-scroll">
        <p class="text-white/75 leading-relaxed text-base md:text-lg mb-6">
          {{ t('craftVillage.intro') }}
        </p>
        <p class="text-white/65 leading-relaxed mb-10">
          {{ t('craftVillage.body') }}
        </p>
        <ul class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          <li
            v-for="key in valueKeys"
            :key="key"
            class="flex items-start gap-3 p-4 rounded-lg bg-white/5 border border-white/8"
          >
            <svg class="mt-0.5 w-5 h-5 flex-shrink-0 text-primary-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M20 6 9 17l-5-5" />
            </svg>
            <span class="text-sm md:text-base text-white/85">{{ t(`craftVillage.values.${key}`) }}</span>
          </li>
        </ul>
        <div class="flex flex-wrap gap-3">
          <NuxtLink :to="localePath('/san-pham-list')" class="btn-primary">
            {{ t('nav.products') }}
          </NuxtLink>
          <NuxtLink :to="localePath('/lien-he')" class="btn-ghost">
            {{ t('nav.contact') }}
          </NuxtLink>
        </div>
      </div>
    </section>
  </div>
</template>
