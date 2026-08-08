<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()

const status = computed(() => String(route.query.status || ''))
const orderNumber = computed(() => String(route.query.order || ''))

const isSuccess = computed(() => status.value === 'success')

useSeoMeta({
  title: () => t('paymentResult.title'),
})
</script>

<template>
  <div class="bg-dark min-h-[60vh] text-white">
    <LayoutPageHero :label="t('paymentResult.eyebrow')" :title="t('paymentResult.title')" />

    <section class="section-py bg-dark-800">
      <div class="container-page max-w-lg mx-auto text-center">
        <div
          v-if="isSuccess"
          class="text-green-400 bg-green-500/10 border border-green-500/30 p-6 rounded-lg"
        >
          <p class="text-lg font-semibold mb-2">✅ {{ t('paymentResult.success') }}</p>
          <p v-if="orderNumber" class="text-sm text-white/70">
            {{ t('paymentResult.orderNumber', { number: orderNumber }) }}
          </p>
        </div>
        <div
          v-else
          class="text-red-400 bg-red-500/10 border border-red-500/30 p-6 rounded-lg"
        >
          <p class="text-lg font-semibold mb-2">❌ {{ t('paymentResult.failed') }}</p>
          <p class="text-sm text-white/70">{{ t('paymentResult.failedHint') }}</p>
        </div>

        <div class="flex flex-col sm:flex-row gap-3 justify-center mt-8">
          <NuxtLink :to="localePath('/tra-cuu-don')" class="btn-primary min-h-[44px]">
            {{ t('orderLookup.title') }}
          </NuxtLink>
          <NuxtLink :to="localePath('/san-pham-list')" class="btn-ghost min-h-[44px]">
            {{ t('cart.continueShopping') }}
          </NuxtLink>
        </div>
      </div>
    </section>
  </div>
</template>
