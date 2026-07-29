<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
  label?: string
}>()
</script>

<template>
  <section class="bg-dark text-white pt-8 pb-14 md:pt-12 md:pb-20">
    <div class="container-page text-center">
      <h1 class="font-heading text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
        {{ title }}
      </h1>
      <div class="divider-gold" />
      <p v-if="subtitle" class="text-white/60 mt-4 max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
        {{ subtitle }}
      </p>
    </div>
  </section>
</template>
