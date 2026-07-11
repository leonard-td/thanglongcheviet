<script setup lang="ts">
const { t } = useI18n()
const { submitContact } = useContact()

const form = reactive({
  contactName: '',
  companyName: '',
  phone: '',
  email: '',
  quantity: '',
  notes: '',
})

const status = ref<'idle' | 'submitting' | 'success' | 'error'>('idle')
const feedbackMessage = ref('')

async function handleSubmit() {
  if (!form.contactName || !form.phone) return
  status.value = 'submitting'

  const messageStr = `Công ty: ${form.companyName || 'N/A'}\nSố lượng: ${form.quantity || 'N/A'}\nGhi chú: ${form.notes || 'Không có'}`

  const res = await submitContact({
    name: form.contactName,
    phone: form.phone,
    email: form.email,
    service: 'corporate-gifts',
    message: messageStr,
    source: 'corporate-landing',
  })

  status.value = res.success ? 'success' : 'error'
  feedbackMessage.value = res.message || ''
  if (res.success) {
    setTimeout(() => {
      status.value = 'idle'
      form.contactName = form.companyName = form.phone = form.email = form.quantity = form.notes = ''
    }, 5000)
  }
}
</script>

<template>
  <section class="section-py bg-dark text-white border-t border-white/10" aria-labelledby="corporate-form">
    <div class="container-page max-w-4xl mx-auto text-center mb-10">
      <h3 class="text-xs uppercase tracking-widest text-primary-400 mb-2 mt-1 animate-on-scroll">
        {{ t('corporate.form.eyebrow') }}
      </h3>
      <h2 class="text-3xl lg:text-4xl font-light mb-4 animate-on-scroll">
        {{ t('corporate.form.title') }}
      </h2>
      <p class="text-white/70 max-w-2xl mx-auto animate-on-scroll">
        {{ t('corporate.form.subtitle') }}
      </p>
    </div>

    <div class="container-page max-w-3xl mx-auto animate-on-scroll">
      <form class="bg-white/5 border border-white/10 p-6 md:p-10 space-y-6" novalidate @submit.prevent="handleSubmit">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Company Name -->
          <div>
            <label for="corp-company" class="block text-xs uppercase tracking-widest text-primary-400 mb-1.5">
              {{ t('corporate.form.company') }}
            </label>
            <input id="corp-company" v-model="form.companyName" type="text"
              :placeholder="t('corporate.form.companyPlaceholder')"
              class="w-full px-4 py-3 bg-white/5 border border-white/15 text-white placeholder-white/30 text-sm focus:outline-none focus:border-primary-500 transition-colors min-h-[44px]">
          </div>

          <!-- Contact Name -->
          <div>
            <label for="corp-name" class="block text-xs uppercase tracking-widest text-primary-400 mb-1.5">
              {{ t('corporate.form.contactName') }} <span class="text-red-400">*</span>
            </label>
            <input id="corp-name" v-model="form.contactName" type="text"
              :placeholder="t('corporate.form.contactName')" required
              class="w-full px-4 py-3 bg-white/5 border border-white/15 text-white placeholder-white/30 text-sm focus:outline-none focus:border-primary-500 transition-colors min-h-[44px]">
          </div>

          <!-- Phone -->
          <div>
            <label for="corp-phone" class="block text-xs uppercase tracking-widest text-primary-400 mb-1.5">
              {{ t('contact.form.phone') }} <span class="text-red-400">*</span>
            </label>
            <input id="corp-phone" v-model="form.phone" type="tel" inputmode="numeric"
              :placeholder="t('contact.form.phonePlaceholder')" required
              class="w-full px-4 py-3 bg-white/5 border border-white/15 text-white placeholder-white/30 text-sm focus:outline-none focus:border-primary-500 transition-colors min-h-[44px]">
          </div>

          <!-- Email -->
          <div>
            <label for="corp-email" class="block text-xs uppercase tracking-widest text-primary-400 mb-1.5">
              {{ t('contact.form.email') }} <span class="text-red-400">*</span>
            </label>
            <input id="corp-email" v-model="form.email" type="email" required
              :placeholder="t('contact.form.emailPlaceholder')"
              class="w-full px-4 py-3 bg-white/5 border border-white/15 text-white placeholder-white/30 text-sm focus:outline-none focus:border-primary-500 transition-colors min-h-[44px]">
          </div>
        </div>

        <!-- Quantity -->
        <div>
          <label for="corp-quantity" class="block text-xs uppercase tracking-widest text-primary-400 mb-1.5">
            {{ t('corporate.form.quantity') }}
          </label>
          <select id="corp-quantity" v-model="form.quantity"
            class="w-full px-4 py-3 bg-dark border border-white/15 text-white/70 text-sm focus:outline-none focus:border-primary-500 transition-colors min-h-[44px]">
            <option value="">{{ t('corporate.form.quantityPlaceholder') }}</option>
            <option value="Dưới 50 hộp">Dưới 50 hộp / Under 50 boxes</option>
            <option value="50 - 100 hộp">50 - 100 hộp / 50-100 boxes</option>
            <option value="100 - 500 hộp">100 - 500 hộp / 100-500 boxes</option>
            <option value="Trên 500 hộp">Trên 500 hộp / 500+ boxes</option>
          </select>
        </div>

        <!-- Message -->
        <div>
          <label for="corp-message" class="block text-xs uppercase tracking-widest text-primary-400 mb-1.5">
            {{ t('contact.form.message') }}
          </label>
          <textarea id="corp-message" v-model="form.notes" rows="4"
            :placeholder="t('contact.form.messagePlaceholder')"
            class="w-full px-4 py-3 bg-white/5 border border-white/15 text-white placeholder-white/30 text-sm resize-none focus:outline-none focus:border-primary-500 transition-colors" />
        </div>

        <!-- Honeypot -->
        <input type="text" name="_honey" class="hidden" tabindex="-1" autocomplete="off">

        <!-- Submit -->
        <div class="pt-2">
          <button type="submit" :disabled="status === 'submitting'"
            class="btn-primary w-full justify-center py-4 text-sm uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed">
            <span v-if="status === 'submitting'">{{ t('contact.form.submitting') }}</span>
            <span v-else>{{ t('corporate.form.submit') }}</span>
          </button>
        </div>

        <!-- Feedback -->
        <Transition enter-active-class="transition-opacity duration-300" enter-from-class="opacity-0">
          <div v-if="status === 'success'"
            class="text-green-400 bg-green-500/10 border border-green-500/30 p-4 text-center mt-4">
            ✅ {{ t('contact.form.success') }}
          </div>
          <div v-else-if="status === 'error'"
            class="text-red-400 bg-red-500/10 border border-red-500/30 p-4 text-center mt-4">
            ❌ {{ feedbackMessage || t('contact.form.error') }}
          </div>
        </Transition>
      </form>
    </div>
  </section>
</template>
