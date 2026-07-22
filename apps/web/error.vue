<script setup lang="ts">
const error = useError()
const localePath = useLocalePath()
const { t } = useI18n()

const statusCode = computed(() => error.value?.statusCode || 500)
const title = computed(() =>
  statusCode.value === 404
    ? t('error.notFoundTitle')
    : t('error.genericTitle'),
)
const message = computed(() =>
  statusCode.value === 404
    ? t('error.notFoundBody')
    : (error.value?.statusMessage || t('error.genericBody')),
)

const clear = () => clearError({ redirect: localePath('/') })
</script>

<template>
  <div class="min-h-[70vh] flex items-center justify-center bg-[#141810] text-white px-4">
    <div class="text-center max-w-lg">
      <p class="text-primary-400 text-sm uppercase tracking-[0.2em] mb-3">
        {{ statusCode }}
      </p>
      <h1 class="font-heading text-3xl md:text-4xl font-bold mb-4">
        {{ title }}
      </h1>
      <p class="text-white/65 mb-8 leading-relaxed">
        {{ message }}
      </p>
      <button
        type="button"
        class="inline-flex items-center justify-center min-h-[44px] px-6 py-3
               bg-gradient-to-br from-[#7a4a12] to-[#64231e] text-[#e8d5a8]
               text-xs font-bold uppercase tracking-widest rounded-sm"
        @click="clear"
      >
        {{ t('nav.home') }}
      </button>
    </div>
  </div>
</template>
