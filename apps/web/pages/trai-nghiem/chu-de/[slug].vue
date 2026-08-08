<script setup lang="ts">
const { t, locale } = useI18n()
const route = useRoute()
const localePath = useLocalePath()
const { topics, getTopicBySlug } = useTopicsByType('event')
const { byTopic, pending: eventsPending } = useEvents()

useScrollAnimation()

const slug = computed(() => String(route.params.slug))

const { data, pending: topicPending } = useAsyncData(
  () => `event-topic-${slug.value}`,
  () => getTopicBySlug(slug.value),
  { watch: [slug] },
)

const pending = computed(() => topicPending.value || eventsPending.value)

watchEffect(() => {
  if (!topicPending.value && !data.value) {
    throw createError({ statusCode: 404, statusMessage: 'Topic not found', fatal: true })
  }
})

// Banner full-bleed: header trong suốt nằm đè lên banner, chuyển nền đặc
// khi scroll hết banner (xem composables/useHeaderBanner.ts)
const bannerEl = ref<HTMLElement | null>(null)
useBannerHeader(bannerEl)

const topic = computed(() => data.value ?? null)
const events = computed(() => (topic.value ? byTopic(topic.value.id) : []))

const formatDate = (value: string | null) => {
  if (!value) return ''
  return new Date(value).toLocaleString(locale.value === 'vi' ? 'vi-VN' : 'en-US', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const seoTitle = computed(() => `${topic.value?.name ?? ''} | ${t('events.title')}`)
const seoDescription = computed(() => topic.value?.description || t('events.subtitle'))
const seoImage = computed(() => topic.value?.image || undefined)

useSeoMeta({
  title: () => seoTitle.value,
  description: () => seoDescription.value,
  ogTitle: () => seoTitle.value,
  ogDescription: () => seoDescription.value,
  ogImage: () => seoImage.value,
  ogType: 'website',
  twitterCard: 'summary_large_image',
  twitterTitle: () => seoTitle.value,
  twitterDescription: () => seoDescription.value,
  twitterImage: () => seoImage.value,
})
</script>

<template>
  <div class="bg-dark min-h-[60vh]">
    <!-- ── Topic banner ─────────────────────────────── -->
    <section ref="bannerEl" class="sticky top-0 z-40 -mt-[72px] bg-dark text-white">
      <div class="relative h-[105px] sm:h-[125px] md:h-[155px] overflow-hidden">
        <img v-if="topic?.image" :src="topic.image" :alt="topic?.name || ''"
          class="absolute inset-0 h-full w-full object-cover">
        <div v-else class="absolute inset-0 bg-gradient-to-br from-primary-800 via-dark-700 to-dark" />
        <div class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20" />

        <div class="relative h-full container-page flex flex-col justify-end pb-3 md:pb-4">
          <h1 class="font-heading text-xl sm:text-2xl md:text-3xl font-bold max-w-3xl line-clamp-1">
            {{ topic?.name }}
          </h1>
          <p class="mt-1.5 hidden md:inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-primary-300">
            <span class="h-[2px] w-8 bg-primary-400 inline-block" />
            {{ t('events.topics.itemCount', { count: events.length }) }}
          </p>
        </div>
      </div>
    </section>

    <!-- ── Events grid + topics menu ─────────────────── -->
    <section class="section-py bg-dark" aria-labelledby="topic-events-heading">
      <div class="container-page">
        <h2 id="topic-events-heading" class="sr-only">{{ topic?.name }}</h2>

        <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-10 xl:gap-14">
        <div class="min-w-0">
        <!-- Loading skeleton -->
        <div v-if="pending" class="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
          <div v-for="n in 4" :key="n"
            class="rounded-2xl overflow-hidden bg-white/[0.04] ring-1 ring-white/10 animate-pulse">
            <div class="aspect-[16/10] bg-white/5" />
            <div class="p-6 space-y-3">
              <div class="h-3 w-24 rounded bg-white/10" />
              <div class="h-5 w-3/4 rounded bg-white/10" />
              <div class="h-3 w-full rounded bg-white/10" />
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div v-else-if="!events.length" class="py-8 text-center">
          <p class="font-heading text-xl text-white mb-2">{{ t('events.topics.emptyTitle') }}</p>
          <p class="text-sm text-white/60 mb-8">{{ t('events.topics.emptyDesc') }}</p>
          <NuxtLink :to="localePath('/trai-nghiem')" class="btn-primary">
            {{ t('events.title') }}
          </NuxtLink>
        </div>

        <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
          <article
            v-for="event in events"
            :key="event.slug"
            class="group flex flex-col overflow-hidden rounded-2xl bg-white/[0.04] animate-on-scroll
                   ring-1 ring-white/10 hover:ring-primary-400/50
                   hover:-translate-y-1 hover:shadow-xl hover:shadow-black/30 transition-all duration-300"
          >
            <NuxtLink
              :to="localePath(`/trai-nghiem/${event.slug}`)"
              class="relative block aspect-[16/10] overflow-hidden"
              :aria-label="event.title"
            >
              <img :src="event.image" :alt="event.title" loading="lazy"
                class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105">
              <span
                v-if="event.seatsLeft === 0"
                class="absolute left-4 top-4 inline-flex items-center rounded-full
                       bg-red-600 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white shadow"
              >
                {{ t('events.full') }}
              </span>
            </NuxtLink>

            <div class="flex flex-1 flex-col p-6">
              <time v-if="event.startAt" class="text-primary-400 text-xs uppercase tracking-[0.2em]">
                {{ formatDate(event.startAt) }}
              </time>
              <h3 class="font-heading text-lg md:text-xl font-semibold text-white mt-2 mb-3
                         group-hover:text-primary-400 transition-colors line-clamp-2">
                <NuxtLink :to="localePath(`/trai-nghiem/${event.slug}`)">
                  {{ event.title }}
                </NuxtLink>
              </h3>
              <p v-if="event.location" class="text-white/60 text-sm mb-2 inline-flex items-start gap-2">
                <svg class="w-4 h-4 mt-0.5 shrink-0 text-primary-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
                </svg>
                {{ event.location }}
              </p>
              <p class="text-white/50 text-sm leading-relaxed line-clamp-3">
                {{ event.excerpt }}
              </p>
              <NuxtLink
                :to="localePath(`/trai-nghiem/${event.slug}`)"
                class="mt-auto pt-4 inline-flex items-center gap-1.5 text-primary-400 text-xs
                       font-condensed uppercase tracking-[0.15em] hover:text-primary-300 transition-colors"
              >
                {{ event.registrationOpen && event.seatsLeft !== 0 ? t('events.registerCta') : t('events.viewDetail') }}
                <svg class="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </NuxtLink>
            </div>
          </article>
        </div>
        </div>

        <!-- ── Menu chủ đề bên phải ─────────────────── -->
        <aside
          v-if="topics.length"
          class="lg:sticky lg:top-[210px] lg:self-start"
          :aria-label="t('events.topics.browse')"
        >
          <h2 class="mb-4 flex items-center gap-2 font-heading text-lg font-semibold text-white">
            <span class="h-[2px] w-6 bg-primary-400 inline-block flex-none" />
            <span class="truncate">{{ t('events.topics.browse') }}</span>
          </h2>
          <nav class="rounded-2xl bg-white/[0.03] ring-1 ring-white/10 overflow-hidden">
            <ul>
              <li v-for="item in topics" :key="item.id" class="border-b border-white/5 last:border-0">
                <NuxtLink
                  :to="localePath(`/trai-nghiem/chu-de/${item.slug}`)"
                  class="flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors"
                  :class="item.slug === slug
                    ? 'bg-primary-500/15 text-primary-300'
                    : 'text-white/70 hover:bg-white/[0.05] hover:text-primary-300'"
                >
                  <span class="truncate">{{ item.name }}</span>
                </NuxtLink>
              </li>
            </ul>
          </nav>
        </aside>
        </div>
      </div>
    </section>
  </div>
</template>
