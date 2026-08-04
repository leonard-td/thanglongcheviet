<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const { site } = useSettings()
const {
  items,
  loading,
  totals,
  promoCodes,
  fetchCart,
  updateCart,
  removeFromCart,
  applyPromoCode,
  removePromoCode,
  checkout,
} = useCart()
const { customer, isLoggedIn, fetchProfile } = useCustomerAuth()
const { methods: paymentMethods, fetchPaymentMethods } = usePayment()

// Utility page: keep header solid so cart rows don't scroll under transparent nav.
const headerThreshold = useHeaderSolidThreshold()
onMounted(() => {
  headerThreshold.value = -1
})
onBeforeUnmount(() => {
  headerThreshold.value = DEFAULT_HEADER_SOLID_THRESHOLD
})

const form = reactive({
  name: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  paymentMethod: 'pp_system_default',
})

onMounted(async () => {
  await fetchCart()
  await fetchPaymentMethods()
  if (isLoggedIn.value && !customer.value) {
    await fetchProfile()
  }
  if (customer.value) {
    form.name = form.name || customer.value.name
    form.phone = form.phone || customer.value.phone
    form.email = form.email || customer.value.email || ''
  }
})

const couponCode = ref('')
const couponMessage = ref('')
const couponOk = ref(false)
const message = ref('')
const error = ref('')

const formatPrice = (price: number) =>
  `${price.toLocaleString('vi-VN')} ${t('common.currency')}`

const handleApplyCoupon = async () => {
  couponMessage.value = ''
  if (!couponCode.value.trim()) return
  const res = await applyPromoCode(couponCode.value.trim())
  couponOk.value = res.success
  if (res.success) {
    couponMessage.value = t('cart.couponApplied', { amount: formatPrice(res.discount ?? 0) })
    couponCode.value = ''
  } else if (totals.discount > 0 && promoCodes.value.length) {
    // Automatic promotions may already discount the cart; manual apply is not needed.
    couponMessage.value = t('cart.couponAlreadyApplied')
    couponOk.value = true
    couponCode.value = ''
  } else {
    couponMessage.value = res.message || t('cart.couponInvalid')
  }
}

const handleRemoveCoupon = async (code: string) => {
  couponMessage.value = ''
  couponOk.value = false
  await removePromoCode(code)
}

const handleUpdateQty = async (itemId: string, qty: number) => {
  error.value = ''
  if (qty <= 0) {
    await handleRemoveItem(itemId)
    return
  }
  const res = await updateCart(itemId, qty)
  if (res && !res.success) error.value = res.message || t('cart.updateError')
}

const handleRemoveItem = async (itemId: string) => {
  error.value = ''
  const res = await removeFromCart(itemId)
  if (res && !res.success) error.value = res.message || t('cart.removeError')
}

const handleCheckout = async () => {
  error.value = ''
  message.value = ''
  couponMessage.value = ''
  if (!form.name || !form.phone || !form.address) {
    error.value = t('cart.formRequired')
    return
  }
  const res = await checkout({
    name: form.name,
    phone: form.phone,
    address: form.address,
    city: form.city.trim() || undefined,
    email: form.email.trim() || undefined,
    payment_provider_id: form.paymentMethod,
  })
  if (res.success) {
    if (res.paymentUrl) {
      window.location.href = res.paymentUrl
      return
    }
    message.value = res.orderNumber
      ? t('cart.orderSuccess', { number: res.orderNumber })
      : res.message
    form.name = ''
    form.phone = ''
    form.email = ''
    form.address = ''
    form.city = ''
    couponCode.value = ''
  } else {
    error.value = res.message
  }
}

useSeoMeta({
  title: () => `${t('cart.title')} | ${site.value.name}`,
})
</script>

<template>
  <div class="bg-dark min-h-[60vh] text-white">
    <LayoutPageHero :label="t('cart.eyebrow')" :title="t('cart.title')" />

    <section class="section-py bg-dark-800">
      <div class="container-page max-w-4xl">
        <div v-if="loading && !items.length" class="text-white/50 text-center py-12">
          {{ t('common.loading') }}
        </div>

        <div v-else-if="!items.length" class="text-center py-12">
          <p class="text-white/60 mb-6">{{ t('cart.empty') }}</p>
          <NuxtLink :to="localePath('/san-pham-list')" class="btn-primary">
            {{ t('cart.continueShopping') }}
          </NuxtLink>
        </div>

        <template v-else>
          <ul class="space-y-4 mb-10">
            <li
              v-for="item in items"
              :key="item.id"
              class="flex flex-col sm:flex-row gap-4 p-4 border border-white/10 rounded-lg"
            >
              <img
                v-if="item.product?.image"
                :src="item.product.image"
                :alt="item.product.title"
                class="w-24 h-24 object-cover rounded-md flex-shrink-0"
              >
              <div class="flex-1 min-w-0">
                <NuxtLink
                  v-if="item.product"
                  :to="localePath(`/san-pham/${item.product.slug}`)"
                  class="font-semibold hover:text-primary-400"
                >
                  {{ item.product.title }}
                </NuxtLink>
                <p class="text-primary-400 mt-1">
                  {{ formatPrice(item.product?.price || 0) }}
                </p>
                <div class="flex flex-wrap items-center gap-3 mt-3">
                  <label class="text-sm text-white/60">{{ t('cart.quantity') }}</label>
                  <input
                    :value="item.quantity"
                    type="number"
                    min="1"
                    class="w-20 px-2 py-1 rounded bg-dark text-white border border-white/20 min-h-[44px]"
                    @change="(e) => {
                      const qty = Number((e.target as HTMLInputElement).value)
                      handleUpdateQty(item.id, qty)
                    }"
                  >
                  <button
                    type="button"
                    class="text-sm text-red-400 hover:text-red-300 min-h-[44px] px-2"
                    @click="handleRemoveItem(item.id)"
                  >
                    {{ t('cart.remove') }}
                  </button>
                </div>
              </div>
            </li>
          </ul>

          <div class="border-t border-white/10 pt-6 mb-6 space-y-2 max-w-lg">
            <div class="flex justify-between items-center text-white/70">
              <span>{{ t('cart.subtotal') }}</span>
              <span>{{ formatPrice(totals.subtotal) }}</span>
            </div>
            <div v-if="totals.discount > 0" class="flex justify-between items-center text-green-400">
              <span>{{ t('cart.discount') }}</span>
              <span>-{{ formatPrice(totals.discount) }}</span>
            </div>
            <div v-if="totals.shipping > 0" class="flex justify-between items-center text-white/70">
              <span>{{ t('cart.shipping') }}</span>
              <span>{{ formatPrice(totals.shipping) }}</span>
            </div>
            <div class="flex justify-between items-center pt-2">
              <span class="text-lg font-semibold">{{ t('cart.total') }}</span>
              <span class="text-xl text-primary-400 font-bold">{{ formatPrice(totals.total) }}</span>
            </div>
          </div>

          <div class="flex flex-col sm:flex-row gap-3 mb-3 max-w-lg">
            <input
              v-model="couponCode"
              type="text"
              :placeholder="t('cart.couponPlaceholder')"
              class="flex-1 px-4 py-3 rounded bg-dark border border-white/20 min-h-[44px]"
              @keyup.enter="handleApplyCoupon"
            >
            <button
              type="button"
              class="btn-ghost min-h-[44px] px-6"
              :disabled="loading"
              @click="handleApplyCoupon"
            >
              {{ t('cart.couponApply') }}
            </button>
          </div>
          <div v-if="promoCodes.length" class="flex flex-wrap gap-2 mb-3 max-w-lg">
            <span
              v-for="code in promoCodes"
              :key="code"
              class="inline-flex items-center gap-2 bg-primary-500/15 border border-primary-500/40
                     text-primary-300 text-xs uppercase tracking-wider px-3 py-1.5"
            >
              {{ code }}
              <button
                type="button"
                class="text-primary-300/70 hover:text-white leading-none"
                :aria-label="`${t('cart.remove')} ${code}`"
                @click="handleRemoveCoupon(code)"
              >
                ✕
              </button>
            </span>
          </div>
          <p v-if="couponMessage" class="text-sm mb-6" :class="couponOk ? 'text-green-400' : 'text-red-400'">
            {{ couponMessage }}
          </p>
          <div v-else class="mb-6" />

          <form class="space-y-4 max-w-lg" @submit.prevent="handleCheckout">
            <h2 class="text-xl font-semibold mb-2">{{ t('cart.checkoutTitle') }}</h2>
            <input
              v-model="form.name"
              type="text"
              :placeholder="t('contact.form.name')"
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
            <input
              v-model="form.email"
              type="email"
              inputmode="email"
              autocomplete="email"
              :placeholder="t('cart.emailOptional')"
              class="w-full px-4 py-3 rounded bg-dark border border-white/20 min-h-[44px]"
            >
            <input
              v-model="form.city"
              type="text"
              autocomplete="address-level2"
              :placeholder="t('cart.city')"
              class="w-full px-4 py-3 rounded bg-dark border border-white/20 min-h-[44px]"
            >
            <textarea
              v-model="form.address"
              rows="3"
              :placeholder="t('cart.address')"
              class="w-full px-4 py-3 rounded bg-dark border border-white/20"
              required
            />
            <fieldset v-if="paymentMethods.length > 1" class="space-y-2">
              <legend class="text-sm text-white/70 mb-2">{{ t('cart.paymentMethod') }}</legend>
              <label
                v-for="method in paymentMethods"
                :key="method.id"
                class="flex items-center gap-3 min-h-[44px] cursor-pointer"
              >
                <input
                  v-model="form.paymentMethod"
                  type="radio"
                  :value="method.id"
                  class="w-4 h-4"
                >
                <span class="text-sm">{{ method.label }}</span>
              </label>
            </fieldset>
            <p v-if="error" class="text-red-400 text-sm">{{ error }}</p>
            <p v-if="message" class="text-green-400 text-sm">{{ message }}</p>
            <button
              type="submit"
              class="btn-primary w-full md:w-auto min-h-[44px]"
              :disabled="loading"
            >
              {{ loading ? t('cart.submitting') : t('cart.submit') }}
            </button>
          </form>
        </template>
      </div>
    </section>
  </div>
</template>
