<script setup lang="ts">
const { t, locale } = useI18n()
const route = useRoute()
const localePath = useLocalePath()
const { getBySlug, registerForEvent } = useEvents()

useScrollAnimation()

const slug = computed(() => String(route.params.slug))

const { data: event, pending, refresh } = useAsyncData(
  () => `event-${slug.value}`,
  () => getBySlug(slug.value),
  { watch: [slug] },
)

watchEffect(() => {
  if (!pending.value && !event.value) {
    throw createError({ statusCode: 404, statusMessage: 'Event not found', fatal: true })
  }
})

const formatDateTime = (value: string | null) => {
  if (!value) return ''
  return new Date(value).toLocaleString(locale.value === 'vi' ? 'vi-VN' : 'en-US', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const canRegister = computed(() =>
  !!event.value
  && event.value.registrationOpen
  && !event.value.isPast
  && event.value.seatsLeft !== 0,
)

const registrationClosedReason = computed(() => {
  if (!event.value || canRegister.value) return ''
  if (event.value.isPast) return t('events.register.endedNotice')
  if (event.value.seatsLeft === 0) return t('events.register.fullNotice')
  return t('events.register.closedNotice')
})

// ── Registration form ─────────────────────────────
const form = reactive({
  name: '',
  phone: '',
  email: '',
  quantity: 1,
  message: '',
})
const submitting = ref(false)
const feedback = ref<{ success: boolean, message: string } | null>(null)

const handleSubmit = async () => {
  if (!event.value || submitting.value) return
  submitting.value = true
  feedback.value = null

  const result = await registerForEvent({
    eventId: event.value.id,
    name: form.name,
    phone: form.phone,
    email: form.email,
    quantity: Number(form.quantity) || 1,
    message: form.message,
  })

  feedback.value = result ?? null
  submitting.value = false

  if (result?.success) {
    form.name = ''
    form.phone = ''
    form.email = ''
    form.quantity = 1
    form.message = ''
    refresh()
  }
}

const seoTitle = computed(() => event.value?.seoTitle || event.value?.title || '')
const seoDescription = computed(() => event.value?.seoDescription || event.value?.excerpt || '')

useSeoMeta({
  title: () => `${seoTitle.value} | ${t('events.title')}`,
  description: () => seoDescription.value,
  keywords: () => event.value?.seoKeywords || undefined,
  ogTitle: () => seoTitle.value,
  ogDescription: () => seoDescription.value,
  ogImage: () => event.value?.image,
  twitterCard: 'summary_large_image',
  twitterTitle: () => seoTitle.value,
  twitterDescription: () => seoDescription.value,
  twitterImage: () => event.value?.image,
})
</script>

<template>
  <div class="bg-dark min-h-[60vh]">
    <template v-if="event">
      <!-- ── Event header ─────────────────────────────── -->
      <header class="container-page pt-10 md:pt-16 pb-8 text-center">
        <nav class="mb-6 text-[11px] uppercase tracking-[0.2em] text-white/50" aria-label="breadcrumb">
          <ol class="flex flex-wrap items-center justify-center gap-2">
            <li>
              <NuxtLink :to="localePath('/')" class="hover:text-primary-300 transition-colors">
                {{ t('nav.home') }}
              </NuxtLink>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <NuxtLink :to="localePath('/trai-nghiem')" class="hover:text-primary-300 transition-colors">
                {{ t('events.title') }}
              </NuxtLink>
            </li>
          </ol>
        </nav>

        <span
          v-if="event.isPast"
          class="inline-flex items-center rounded-full bg-white/10 px-4 py-1.5 mb-5
                 text-[11px] font-semibold uppercase tracking-wider text-white/70"
        >
          {{ t('events.ended') }}
        </span>

        <h1 class="font-heading text-3xl sm:text-4xl md:text-5xl font-bold leading-tight max-w-4xl mx-auto text-white">
          {{ event.title }}
        </h1>

        <div class="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs uppercase tracking-[0.18em] text-white/50">
          <span v-if="event.startAt" class="inline-flex items-center gap-2">
            <svg class="w-4 h-4 text-primary-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            <time>{{ formatDateTime(event.startAt) }}</time>
          </span>
          <span v-if="event.endAt" class="inline-flex items-center gap-2">
            <svg class="w-4 h-4 text-primary-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
            </svg>
            {{ t('events.detail.until', { time: formatDateTime(event.endAt) }) }}
          </span>
          <span v-if="event.location" class="inline-flex items-center gap-2">
            <svg class="w-4 h-4 text-primary-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
            </svg>
            {{ event.location }}
          </span>
          <span v-if="event.capacity" class="inline-flex items-center gap-2">
            <svg class="w-4 h-4 text-primary-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
            </svg>
            {{ t('events.detail.seatsLeft', { count: event.seatsLeft ?? 0 }) }}
          </span>
        </div>
      </header>

      <!-- ── Hero image ─────────────────────────────── -->
      <div class="container-page">
        <div class="max-w-5xl mx-auto overflow-hidden rounded-2xl md:rounded-3xl shadow-lg shadow-black/30 ring-1 ring-white/10">
          <img
            :src="event.image"
            :alt="event.title"
            class="w-full aspect-[16/9] md:aspect-[21/9] object-cover"
          >
        </div>
      </div>

      <!-- ── Event body ─────────────────────────────── -->
      <article class="container-page py-10 md:py-16">
        <div class="max-w-3xl mx-auto">
          <div
            v-if="event.content"
            class="article-body"
            v-html="event.content"
          />
          <p v-else class="text-white/50 italic">{{ t('events.comingSoon') }}</p>
        </div>
      </article>

      <!-- ── Registration ───────────────────────────── -->
      <section
        id="dang-ky"
        class="bg-dark-800 border-t border-white/10"
        aria-labelledby="event-register-heading"
      >
        <div class="container-page py-12 md:py-16">
          <div class="max-w-2xl mx-auto">
            <div class="text-center mb-8">
              <h2 id="event-register-heading" class="font-heading text-2xl md:text-3xl font-semibold text-white">
                {{ t('events.register.title') }}
              </h2>
              <div class="divider-gold" />
            </div>

            <!-- Closed notice -->
            <div
              v-if="!canRegister"
              class="rounded-2xl bg-white/[0.04] ring-1 ring-white/10 px-6 py-8 text-center text-white/70"
            >
              {{ registrationClosedReason }}
            </div>

            <!-- Success -->
            <div
              v-else-if="feedback?.success"
              class="rounded-2xl bg-primary-500/10 ring-1 ring-primary-400/40 px-6 py-8 text-center"
            >
              <p class="font-heading text-xl text-white mb-2">{{ t('events.register.successTitle') }}</p>
              <p class="text-sm text-white/70">{{ feedback.message }}</p>
            </div>

            <!-- Form -->
            <form
              v-else
              class="rounded-2xl bg-white/[0.04] ring-1 ring-white/10 p-6 md:p-8 flex flex-col gap-5"
              @submit.prevent="handleSubmit"
            >
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div class="flex flex-col gap-1.5">
                  <label for="reg-name" class="text-xs uppercase tracking-[0.15em] text-white/60">
                    {{ t('events.register.name') }} <span class="text-primary-400">*</span>
                  </label>
                  <input
                    id="reg-name"
                    v-model="form.name"
                    type="text"
                    required
                    class="event-input"
                    :placeholder="t('events.register.namePlaceholder')"
                  >
                </div>
                <div class="flex flex-col gap-1.5">
                  <label for="reg-phone" class="text-xs uppercase tracking-[0.15em] text-white/60">
                    {{ t('events.register.phone') }} <span class="text-primary-400">*</span>
                  </label>
                  <input
                    id="reg-phone"
                    v-model="form.phone"
                    type="tel"
                    required
                    class="event-input"
                    :placeholder="t('events.register.phonePlaceholder')"
                  >
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div class="flex flex-col gap-1.5">
                  <label for="reg-email" class="text-xs uppercase tracking-[0.15em] text-white/60">
                    {{ t('events.register.email') }}
                  </label>
                  <input
                    id="reg-email"
                    v-model="form.email"
                    type="email"
                    class="event-input"
                    placeholder="email@example.com"
                  >
                </div>
                <div class="flex flex-col gap-1.5">
                  <label for="reg-quantity" class="text-xs uppercase tracking-[0.15em] text-white/60">
                    {{ t('events.register.quantity') }}
                  </label>
                  <input
                    id="reg-quantity"
                    v-model.number="form.quantity"
                    type="number"
                    min="1"
                    :max="event.seatsLeft ?? 20"
                    class="event-input"
                  >
                </div>
              </div>

              <div class="flex flex-col gap-1.5">
                <label for="reg-message" class="text-xs uppercase tracking-[0.15em] text-white/60">
                  {{ t('events.register.message') }}
                </label>
                <textarea
                  id="reg-message"
                  v-model="form.message"
                  rows="4"
                  class="event-input resize-y"
                  :placeholder="t('events.register.messagePlaceholder')"
                />
              </div>

              <p v-if="feedback && !feedback.success" class="text-sm text-red-400">
                {{ feedback.message }}
              </p>

              <button
                type="submit"
                class="btn-primary w-full sm:w-auto sm:self-center px-10"
                :disabled="submitting"
              >
                {{ submitting ? t('events.register.submitting') : t('events.register.submit') }}
              </button>
            </form>
          </div>
        </div>
      </section>
    </template>

    <!-- Loading state -->
    <div v-else class="container-page py-20">
      <div class="max-w-3xl mx-auto space-y-6 animate-pulse">
        <div class="h-4 w-40 mx-auto rounded bg-white/10" />
        <div class="h-10 w-3/4 mx-auto rounded bg-white/10" />
        <div class="aspect-[21/9] rounded-3xl bg-white/10" />
        <div class="h-4 w-full rounded bg-white/10" />
        <div class="h-4 w-5/6 rounded bg-white/10" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.event-input {
  @apply rounded-xl bg-white/[0.06] ring-1 ring-white/15 px-4 py-3 text-sm text-white
         placeholder:text-white/30 outline-none transition
         focus:ring-2 focus:ring-primary-400/60;
}

/* TipTap content styling — same treatment as the blog article body */
.article-body {
  @apply text-white/75 leading-[1.85] text-base md:text-lg;
}
.article-body :deep(p) {
  @apply my-5;
}
.article-body :deep(h1),
.article-body :deep(h2) {
  @apply font-heading text-2xl md:text-3xl font-semibold text-white mt-12 mb-4 relative pl-4;
}
.article-body :deep(h1)::before,
.article-body :deep(h2)::before {
  content: '';
  @apply absolute left-0 top-1 bottom-1 w-[4px] rounded-full bg-primary-500;
}
.article-body :deep(h3) {
  @apply font-heading text-xl md:text-2xl font-semibold text-white mt-10 mb-3;
}
.article-body :deep(h4),
.article-body :deep(h5),
.article-body :deep(h6) {
  @apply font-heading text-lg font-semibold text-white mt-8 mb-2;
}
.article-body :deep(a) {
  @apply text-primary-400 underline decoration-primary-400/40 underline-offset-4 transition-colors;
}
.article-body :deep(a:hover) {
  @apply text-primary-300 decoration-primary-300;
}
.article-body :deep(strong) {
  @apply text-white font-semibold;
}
.article-body :deep(blockquote) {
  @apply my-8 border-l-4 border-primary-400 bg-primary-500/10 rounded-r-xl px-6 py-4 italic text-white/80;
}
.article-body :deep(blockquote p) {
  @apply my-0;
}
.article-body :deep(ul),
.article-body :deep(ol) {
  @apply my-5 pl-6 space-y-2;
}
.article-body :deep(ul) {
  @apply list-disc marker:text-primary-400;
}
.article-body :deep(ol) {
  @apply list-decimal marker:text-primary-400 marker:font-semibold;
}
.article-body :deep(img) {
  @apply my-8 w-full rounded-2xl shadow-md shadow-black/30 ring-1 ring-white/10;
}
.article-body :deep(iframe) {
  @apply my-8 rounded-2xl shadow-md shadow-black/30;
}
.article-body :deep(hr) {
  @apply my-10 border-0 h-[2px] bg-gradient-to-r from-transparent via-primary-400/60 to-transparent;
}
.article-body :deep(table) {
  @apply my-6 w-full border-collapse text-sm md:text-base;
}
.article-body :deep(th) {
  @apply bg-primary-500/10 text-white font-semibold border border-primary-400/30 px-4 py-2.5 text-left;
}
.article-body :deep(td) {
  @apply border border-white/10 px-4 py-2.5 bg-white/[0.02] text-white/80;
}
</style>
