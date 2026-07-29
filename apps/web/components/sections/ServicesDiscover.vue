<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const { discoverServices } = useSettings()
</script>

<template>
  <section class="section-py bg-[#1a1a1a] text-white" aria-labelledby="discover-heading">
    <div class="container-page">
      <div class="text-center mb-10 md:mb-14 animate-on-scroll">
        <h2 id="discover-heading" class="section-heading text-white mb-4">
          {{ t('discover.title') }}
        </h2>
        <div class="divider-gold" />
        <p class="text-white/50 text-sm mt-4">{{ t('discover.subtitle') }}</p>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
        <NuxtLink
          v-for="(service, i) in discoverServices"
          :key="i"
          :to="localePath('/dich-vu')"
          class="group flex flex-col items-center justify-center p-6 md:p-8
                 border border-white/10 hover:border-primary-500 hover:bg-white/5
                 transition-all duration-300 animate-on-scroll min-h-[120px]"
        >
          <span class="text-3xl md:text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">
            {{ service.icon }}
          </span>
          <span class="text-xs md:text-sm uppercase tracking-wider text-white/70
                       group-hover:text-primary-400 text-center transition-colors">
            {{ service.label }}
          </span>
        </NuxtLink>
      </div>
    </div>
  </section>
</template>
