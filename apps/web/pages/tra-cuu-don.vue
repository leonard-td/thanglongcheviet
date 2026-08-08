<script setup lang="ts">
import type { OrderLookup } from '~/composables/useOrder'

const { t } = useI18n()
const { lookupOrder } = useOrder()
const { orderStatusLabel, paymentStatusLabel, paymentMethodLabel } = useOrderLabels()

const form = reactive({ number: '', phone: '' })
const error = ref('')
const order = ref<OrderLookup | null>(null)
const loading = ref(false)

const formatPrice = (price: number | string) =>
  `${Number(price).toLocaleString('vi-VN')} ${t('common.currency')}`

const formatDate = (value: string) => new Date(value).toLocaleString()

const handleLookup = async () => {
  error.value = ''
  order.value = null
  if (!form.number || !form.phone) return
  loading.value = true
  const res = await lookupOrder(form.number.trim(), form.phone.trim())
  loading.value = false
  if (res.success) {
    order.value = res.data
  } else {
    error.value = res.message || t('cart.lookupError')
  }
}

useSeoMeta({
  title: () => t('orderLookup.title'),
})
</script>

<template>
  <div class="bg-dark min-h-[60vh] text-white">
    <LayoutPageHero :label="t('orderLookup.eyebrow')" :title="t('orderLookup.title')" />

    <section class="section-py bg-dark-800">
      <div class="container-page max-w-lg mx-auto">
        <p class="text-white/60 text-sm mb-6 text-center">{{ t('orderLookup.subtitle') }}</p>

        <form class="space-y-4" @submit.prevent="handleLookup">
          <input
            v-model="form.number"
            type="text"
            :placeholder="t('orderLookup.numberPlaceholder')"
            class="w-full px-4 py-3 rounded bg-dark border border-white/20 min-h-[44px]"
            required
          >
          <input
            v-model="form.phone"
            type="tel"
            inputmode="tel"
            :placeholder="t('contact.form.phone')"
            class="w-full px-4 py-3 rounded bg-dark border border-white/20 min-h-[44px]"
            required
          >
          <p v-if="error" class="text-red-400 text-sm">{{ error }}</p>
          <button type="submit" class="btn-primary w-full min-h-[44px]" :disabled="loading">
            {{ loading ? t('orderLookup.searching') : t('orderLookup.submit') }}
          </button>
        </form>

        <div v-if="order" class="mt-10 p-5 border border-white/10 rounded-lg space-y-4">
          <div class="flex justify-between gap-4">
            <span class="text-white/60">{{ t('orderLookup.orderNumber') }}</span>
            <span class="font-semibold">{{ order.number }}</span>
          </div>
          <div class="flex justify-between gap-4">
            <span class="text-white/60">{{ t('orderLookup.status') }}</span>
            <span class="text-primary-400 uppercase text-sm">{{ orderStatusLabel(order.status) }}</span>
          </div>
          <div v-if="order.payment_status" class="flex justify-between gap-4">
            <span class="text-white/60">{{ t('orderLookup.paymentStatus') }}</span>
            <span class="text-sm">{{ paymentStatusLabel(order.payment_status) }}</span>
          </div>
          <div v-if="order.payment_method" class="flex justify-between gap-4">
            <span class="text-white/60">{{ t('orderLookup.paymentMethod') }}</span>
            <span class="text-sm">{{ paymentMethodLabel(order.payment_method) }}</span>
          </div>
          <div class="flex justify-between gap-4">
            <span class="text-white/60">{{ t('orderLookup.date') }}</span>
            <span>{{ formatDate(order.created_at) }}</span>
          </div>
          <div class="flex justify-between gap-4">
            <span class="text-white/60">{{ t('cart.total') }}</span>
            <span class="font-bold text-primary-400">{{ formatPrice(order.total_price) }}</span>
          </div>
          <ul v-if="order.items?.length" class="border-t border-white/10 pt-4 space-y-2">
            <li v-for="(item, i) in order.items" :key="i" class="text-sm text-white/80 flex justify-between">
              <span>{{ item.product_name }} × {{ item.quantity }}</span>
              <span>{{ formatPrice(item.price) }}</span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  </div>
</template>
