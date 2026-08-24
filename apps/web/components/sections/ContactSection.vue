<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const { contact, hours } = useSettings()
const { categories: productCategories } = useProducts()
const { submitContact } = useContact()
const { slots, slotsLoading, fetchAvailability, submitBooking } = useBooking()

const form = reactive({
  name: '',
  phone: '',
  email: '',
  service: '',
  message: '',
  preferredDate: '',
  preferredTime: '',
})

const status = ref<'idle' | 'submitting' | 'success' | 'error'>('idle')
const lastWasBooking = ref(false)
const feedbackMessage = ref('')

const serviceOptions = computed(() =>
  productCategories.value.map(c => ({ value: c.slug, label: c.label })),
)

watch(() => form.preferredDate, async (date) => {
  form.preferredTime = ''
  if (date) await fetchAvailability(date)
})

async function handleSubmit() {
  if (!form.name || !form.phone) return
  if (form.preferredDate && !form.preferredTime) {
    status.value = 'error'
    feedbackMessage.value = t('booking.selectTime')
    return
  }
  status.value = 'submitting'

  const isBooking = Boolean(form.preferredDate)
  lastWasBooking.value = isBooking
  const res = isBooking
    ? await submitBooking({
      name: form.name,
      phone: form.phone,
      email: form.email || undefined,
      service: form.service || undefined,
      preferred_date: form.preferredDate,
      preferred_time: form.preferredTime,
      note: form.message || undefined,
    })
    : await submitContact({
      name: form.name,
      phone: form.phone,
      email: form.email,
      service: form.service,
      message: form.message,
      source: 'contact-page',
    })

  status.value = res.success ? 'success' : 'error'
  feedbackMessage.value = res.message || ''
  if (res.success) {
    setTimeout(() => {
      status.value = 'idle'
      form.name = form.phone = form.email = form.service = form.message = ''
      form.preferredDate = form.preferredTime = ''
    }, 5000)
  }
}

</script>

<template>
  <section id="contact" class="section-py bg-[#222] text-white" aria-labelledby="contact-heading">
    <div class="container-page">

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">

        <!-- Left: info -->
        <div class="animate-on-scroll space-y-6 flex flex-col">

          <div v-if="contact.address" class="flex items-start gap-4">
            <div class="w-10 h-10 flex-shrink-0 bg-primary-500/20 border border-primary-500/30
                        flex items-center justify-center text-primary-400">
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                <path d="M20 10.5c0 5.5-8 11-8 11s-8-5.5-8-11a8 8 0 1 1 16 0Z" stroke-linecap="round" stroke-linejoin="round" />
                <circle cx="12" cy="10.5" r="2.5" />
              </svg>
            </div>
            <div>
              <h3 class="text-xs uppercase tracking-widest text-primary-400 mb-1 mt-1">
                {{ t('contact.address') }}
              </h3>
              <p class="text-white/70 text-sm leading-relaxed">
                {{ contact.address }}
              </p>
            </div>
          </div>

          <div v-if="contact.phone" class="flex items-start gap-4">
            <div class="w-10 h-10 flex-shrink-0 bg-primary-500/20 border border-primary-500/30
                        flex items-center justify-center text-primary-400">
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                <path d="M6.6 10.8a15.5 15.5 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.24 11.4 11.4 0 0 0 3.6.58 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.4 11.4 0 0 0 .58 3.6 1 1 0 0 1-.25 1z" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </div>
            <div>
              <h3 class="text-xs uppercase tracking-widest text-primary-400 mb-1 mt-1">
                {{ t('contact.phone') }}
              </h3>
              <a :href="`tel:${contact.phone}`"
                class="text-white font-semibold hover:text-primary-400 transition-colors text-lg">
                {{ contact.phone }}
              </a>
              <a v-if="contact.hotline" :href="`tel:${contact.hotline}`"
                class="block text-white/70 hover:text-primary-400 transition-colors text-sm">
                {{ contact.hotline }}
              </a>
            </div>
          </div>

          <div v-if="hours.length" class="flex items-start gap-4">
            <div class="w-10 h-10 flex-shrink-0 bg-primary-500/20 border border-primary-500/30
                        flex items-center justify-center text-primary-400">
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </div>
            <div>
              <h3 class="text-xs uppercase tracking-widest text-primary-400 mb-2 mt-1">
                {{ t('contact.hours') }}
              </h3>
              <ul class="space-y-0.5">
                <li v-for="h in hours" :key="h.days" class="text-sm text-white/70">
                  <span class="text-white">{{ h.days }}</span><template v-if="h.time">: {{ h.time }}</template>
                </li>
              </ul>
            </div>
          </div>

          <div v-if="contact.email" class="flex items-start gap-4">
            <div class="w-10 h-10 flex-shrink-0 bg-primary-500/20 border border-primary-500/30
                        flex items-center justify-center text-primary-400">
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="m4 7 8 6 8-6" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </div>
            <div>
              <h3 class="text-xs uppercase tracking-widest text-primary-400 mb-1 mt-1">
                {{ t('contact.email') }}
              </h3>
              <a :href="`mailto:${contact.email}`"
                class="text-white/70 hover:text-primary-400 transition-colors text-sm">
                {{ contact.email }}
              </a>
            </div>
          </div>

          <!-- Map — stretch to fill remaining height so it aligns with the form column -->
          <div v-if="contact.mapEmbed" class="mt-6 flex-1 min-h-[200px] bg-white/5 border border-white/10 overflow-hidden">
            <iframe :src="contact.mapEmbed" class="w-full h-full border-0" loading="lazy"
              referrerpolicy="no-referrer-when-downgrade" :title="t('contact.map')" />
          </div>
        </div>

        <!-- Right: form -->
        <div class="animate-on-scroll">
          <form class="bg-white/5 border border-white/10 p-6 md:p-8 space-y-5" novalidate
            @submit.prevent="handleSubmit">
            <!-- Name -->
            <div>
              <label for="contact-name" class="block text-xs uppercase tracking-widest text-primary-400 mb-1.5">
                {{ t('contact.form.name') }} <span class="text-red-400">*</span>
              </label>
              <input id="contact-name" v-model="form.name" type="text" :placeholder="t('contact.form.namePlaceholder')"
                required class="w-full px-4 py-3 bg-white/5 border border-white/15 text-white placeholder-white/30
                       text-sm focus:outline-none focus:border-primary-500 transition-colors min-h-[44px]">
            </div>

            <!-- Phone -->
            <div>
              <label for="contact-phone" class="block text-xs uppercase tracking-widest text-primary-400 mb-1.5">
                {{ t('contact.form.phone') }} <span class="text-red-400">*</span>
              </label>
              <input id="contact-phone" v-model="form.phone" type="tel" inputmode="numeric"
                :placeholder="t('contact.form.phonePlaceholder')" required class="w-full px-4 py-3 bg-white/5 border border-white/15 text-white placeholder-white/30
                       text-sm focus:outline-none focus:border-primary-500 transition-colors min-h-[44px]">
            </div>

            <!-- Email -->
            <div>
              <label for="contact-email" class="block text-xs uppercase tracking-widest text-primary-400 mb-1.5">
                {{ t('contact.form.email') }}
              </label>
              <input id="contact-email" v-model="form.email" type="email"
                :placeholder="t('contact.form.emailPlaceholder')" class="w-full px-4 py-3 bg-white/5 border border-white/15 text-white placeholder-white/30
                       text-sm focus:outline-none focus:border-primary-500 transition-colors min-h-[44px]">
            </div>

            <!-- Service — options come from the Medusa product categories, so
                 hide the field entirely until the catalog has any -->
            <div v-if="serviceOptions.length">
              <label for="contact-service" class="block text-xs uppercase tracking-widest text-primary-400 mb-1.5">
                {{ t('contact.form.service') }}
              </label>
              <select id="contact-service" v-model="form.service" class="w-full px-4 py-3 bg-dark border border-white/15 text-white/70
                       text-sm focus:outline-none focus:border-primary-500 transition-colors min-h-[44px]">
                <option value="">{{ t('contact.form.servicePlaceholder') }}</option>
                <option v-for="opt in serviceOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>

            <!-- Preferred date (booking) -->
            <div>
              <label for="contact-date" class="block text-xs uppercase tracking-widest text-primary-400 mb-1.5">
                {{ t('booking.preferredDate') }}
              </label>
              <input id="contact-date" v-model="form.preferredDate" type="date"
                :min="new Date().toISOString().split('T')[0]" class="w-full px-4 py-3 bg-white/5 border border-white/15 text-white
                       text-sm focus:outline-none focus:border-primary-500 transition-colors min-h-[44px]">
            </div>

            <!-- Preferred time -->
            <div v-if="form.preferredDate">
              <label for="contact-time" class="block text-xs uppercase tracking-widest text-primary-400 mb-1.5">
                {{ t('booking.preferredTime') }}
              </label>
              <p v-if="slotsLoading" class="text-sm text-white/50 mb-2">{{ t('booking.loadingSlots') }}</p>
              <p v-else-if="!slots.length" class="text-sm text-amber-400/90 mb-2">{{ t('booking.noSlots') }}</p>
              <select v-else id="contact-time" v-model="form.preferredTime" class="w-full px-4 py-3 bg-dark border border-white/15 text-white/70
                       text-sm focus:outline-none focus:border-primary-500 transition-colors min-h-[44px]">
                <option value="">{{ t('booking.selectTime') }}</option>
                <option v-for="slot in slots" :key="slot.time" :value="slot.time">
                  {{ slot.time }}
                </option>
              </select>
            </div>

            <!-- Message -->
            <div>
              <label for="contact-message" class="block text-xs uppercase tracking-widest text-primary-400 mb-1.5">
                {{ t('contact.form.message') }}
              </label>
              <textarea id="contact-message" v-model="form.message" rows="3"
                :placeholder="t('contact.form.messagePlaceholder')" class="w-full px-4 py-3 bg-white/5 border border-white/15 text-white placeholder-white/30
                       text-sm resize-none focus:outline-none focus:border-primary-500 transition-colors" />
            </div>

            <!-- Honeypot -->
            <input type="text" name="_honey" class="hidden" tabindex="-1" autocomplete="off">

            <!-- Submit -->
            <button type="submit" :disabled="status === 'submitting'" class="btn-primary w-full justify-center py-4 text-sm uppercase tracking-wider
                     disabled:opacity-50 disabled:cursor-not-allowed">
              <span v-if="status === 'submitting'">{{ t('contact.form.submitting') }}</span>
              <span v-else>{{ t('contact.form.submit') }}</span>
            </button>

            <!-- Feedback -->
            <Transition enter-active-class="transition-opacity duration-300" enter-from-class="opacity-0">
              <div v-if="status === 'success'"
                class="text-green-400 bg-green-500/10 border border-green-500/30 p-3 text-sm space-y-2">
                <p>✅ {{ t('contact.form.success') }}</p>
                <p v-if="lastWasBooking" class="text-green-300/90 text-xs">
                  {{ t('contact.form.bookingHint') }}
                  <NuxtLink :to="localePath('/tai-khoan')" class="underline">{{ t('account.title') }}</NuxtLink>
                </p>
              </div>
              <div v-else-if="status === 'error'"
                class="text-red-400 bg-red-500/10 border border-red-500/30 p-3 text-sm">
                ❌ {{ feedbackMessage || t('contact.form.error') }}
              </div>
            </Transition>
          </form>
        </div>
      </div>
    </div>
  </section>
</template>
