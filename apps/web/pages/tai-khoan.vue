<script setup lang="ts">
const { t } = useI18n()
const { orderStatusLabel, paymentStatusLabel } = useOrderLabels()
const {
  customer,
  isLoggedIn,
  login,
  register,
  logout,
  fetchProfile,
  fetchAppointments,
  cancelAppointment,
  fetchOrders,
} = useCustomerAuth()

const mode = ref<'login' | 'register'>('login')
const form = reactive({ name: '', phone: '', email: '', password: '' })
const error = ref('')
const message = ref('')
const appointments = ref<Awaited<ReturnType<typeof fetchAppointments>>>([])
const orders = ref<Awaited<ReturnType<typeof fetchOrders>>>([])
const loading = ref(false)

onMounted(async () => {
  if (isLoggedIn.value) {
    await fetchProfile()
    appointments.value = await fetchAppointments()
    orders.value = await fetchOrders()
  }
})

const statusLabel = (status: string) => {
  const key = `account.status.${status}` as const
  return t(key, status)
}

const formatDate = (value: string | null) => {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}

const formatPrice = (price: number | string) =>
  `${Number(price).toLocaleString('vi-VN')} ${t('common.currency')}`

const handleAuth = async () => {
  error.value = ''
  message.value = ''
  loading.value = true
  const res = mode.value === 'login'
    ? await login(form.phone, form.password)
    : await register({
        name: form.name,
        phone: form.phone,
        password: form.password,
        email: form.email || undefined,
      })
  loading.value = false

  if (res.success) {
    appointments.value = await fetchAppointments()
    orders.value = await fetchOrders()
    form.password = ''
  } else {
    error.value = res.message || t('account.loginError')
  }
}

const handleLogout = async () => {
  await logout()
  appointments.value = []
  orders.value = []
  message.value = ''
}

const handleCancel = async (id: string) => {
  const res = await cancelAppointment(id)
  if (res.success) {
    appointments.value = await fetchAppointments()
    message.value = res.message || t('account.cancelled')
  } else {
    error.value = res.message || t('account.cancelError')
  }
}

useSeoMeta({
  title: () => t('account.title'),
})
</script>

<template>
  <div class="bg-dark min-h-[60vh] text-white">
    <LayoutPageHero :label="t('account.eyebrow')" :title="t('account.title')" />

    <section class="section-py bg-dark-800">
      <div class="container-page max-w-3xl">
        <div v-if="!isLoggedIn" class="max-w-md mx-auto space-y-4">
          <div class="flex gap-2 mb-6">
            <button
              type="button"
              class="flex-1 py-2 text-sm uppercase tracking-wider border min-h-[44px]"
              :class="mode === 'login' ? 'border-primary-500 text-primary-400' : 'border-white/20 text-white/60'"
              @click="mode = 'login'"
            >
              {{ t('account.login') }}
            </button>
            <button
              type="button"
              class="flex-1 py-2 text-sm uppercase tracking-wider border min-h-[44px]"
              :class="mode === 'register' ? 'border-primary-500 text-primary-400' : 'border-white/20 text-white/60'"
              @click="mode = 'register'"
            >
              {{ t('account.register') }}
            </button>
          </div>

          <form class="space-y-4" @submit.prevent="handleAuth">
            <input
              v-if="mode === 'register'"
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
              v-if="mode === 'register'"
              v-model="form.email"
              type="email"
              :placeholder="t('contact.form.email')"
              class="w-full px-4 py-3 rounded bg-dark border border-white/20 min-h-[44px]"
            >
            <input
              v-model="form.password"
              type="password"
              :placeholder="t('account.password')"
              class="w-full px-4 py-3 rounded bg-dark border border-white/20 min-h-[44px]"
              required
              minlength="6"
            >
            <p v-if="error" class="text-red-400 text-sm">{{ error }}</p>
            <button type="submit" class="btn-primary w-full min-h-[44px]" :disabled="loading">
              {{ loading ? t('account.submitting') : (mode === 'login' ? t('account.login') : t('account.register')) }}
            </button>
          </form>
        </div>

        <div v-else>
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <p class="text-primary-400 text-sm uppercase tracking-widest">{{ t('account.welcome') }}</p>
              <h2 class="text-xl font-semibold mt-1">{{ customer?.name }}</h2>
              <p class="text-white/60 text-sm">{{ customer?.phone }}</p>
            </div>
            <button type="button" class="btn-ghost min-h-[44px]" @click="handleLogout">
              {{ t('account.logout') }}
            </button>
          </div>

          <h3 class="text-lg font-semibold mb-4">{{ t('account.appointments') }}</h3>
          <p v-if="message" class="text-green-400 text-sm mb-4">{{ message }}</p>
          <p v-if="error" class="text-red-400 text-sm mb-4">{{ error }}</p>

          <div v-if="!appointments.length" class="text-white/50 py-8 text-center">
            {{ t('account.noAppointments') }}
          </div>

          <ul v-else class="space-y-4">
            <li
              v-for="item in appointments"
              :key="item.id"
              class="p-4 border border-white/10 rounded-lg flex flex-col sm:flex-row sm:items-center gap-4"
            >
              <div class="flex-1">
                <p class="font-medium">{{ item.service || t('account.generalBooking') }}</p>
                <p class="text-sm text-white/60 mt-1">{{ formatDate(item.scheduled_at) }}</p>
                <span class="inline-block mt-2 text-xs uppercase tracking-wider text-primary-400">
                  {{ statusLabel(item.status) }}
                </span>
              </div>
              <button
                v-if="!['cancelled', 'completed'].includes(item.status)"
                type="button"
                class="text-sm text-red-400 hover:text-red-300 min-h-[44px] px-3"
                @click="handleCancel(item.id)"
              >
                {{ t('account.cancel') }}
              </button>
            </li>
          </ul>

          <h3 class="text-lg font-semibold mb-4 mt-12">{{ t('account.orders') }}</h3>
          <div v-if="!orders.length" class="text-white/50 py-4">
            {{ t('account.noOrders') }}
          </div>
          <ul v-else class="space-y-4">
            <li
              v-for="item in orders"
              :key="item.number"
              class="p-4 border border-white/10 rounded-lg"
            >
              <div class="flex flex-col sm:flex-row sm:justify-between gap-2">
                <span class="font-medium">{{ item.number }}</span>
                <span class="text-primary-400">{{ formatPrice(item.total_price) }}</span>
              </div>
              <p class="text-sm text-white/60 mt-1">{{ formatDate(item.created_at) }}</p>
              <div class="flex flex-wrap gap-2 mt-2 text-xs uppercase tracking-wider">
                <span class="text-white/50">{{ orderStatusLabel(item.status) }}</span>
                <span v-if="item.payment_status" class="text-white/40">· {{ paymentStatusLabel(item.payment_status) }}</span>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </section>
  </div>
</template>
