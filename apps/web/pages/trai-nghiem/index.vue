<script setup lang="ts">
const { t, locale } = useI18n()
const localePath = useLocalePath()
const { upcomingEvents, pastEvents, pending } = useEvents()

useScrollAnimation()

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

useSeoMeta({
  title: () => t('events.title'),
  description: () => t('events.subtitle'),
})
</script>

<template>
  <div class="bg-dark min-h-[60vh]">
    <!-- ── Page header ──────────────────────────────── -->
    <section class="relative bg-dark text-white">
      <div class="container-page pt-14 md:pt-20 pb-10 text-center">
        <h1 class="font-heading text-3xl sm:text-4xl md:text-5xl font-bold">
          {{ t('events.title') }}
        </h1>
        <p class="mt-4 max-w-2xl mx-auto text-sm md:text-base text-white/70 leading-relaxed">
          {{ t('events.subtitle') }}
        </p>
        <div class="divider-gold" />
      </div>
    </section>

    <!-- ── Loading skeleton ─────────────────────────── -->
    <section v-if="pending" class="section-py bg-dark">
      <div class="container-page grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        <div v-for="n in 3" :key="n" class="rounded-2xl overflow-hidden bg-white/[0.04] ring-1 ring-white/10 animate-pulse">
          <div class="aspect-[16/10] bg-white/5" />
          <div class="p-6 space-y-3">
            <div class="h-3 w-24 rounded bg-white/10" />
            <div class="h-5 w-3/4 rounded bg-white/10" />
            <div class="h-3 w-full rounded bg-white/10" />
          </div>
        </div>
      </div>
    </section>

    <!-- ── Empty state ──────────────────────────────── -->
    <section v-else-if="!upcomingEvents.length && !pastEvents.length" class="section-py bg-dark">
      <div class="container-page py-16 text-center">
        <p class="font-heading text-xl text-white mb-2">{{ t('events.emptyTitle') }}</p>
        <p class="text-sm text-white/60">{{ t('events.emptyDesc') }}</p>
      </div>
    </section>

    <template v-else>
      <!-- ── Upcoming events ──────────────────────────── -->
      <section v-if="upcomingEvents.length" class="section-py bg-dark" aria-labelledby="upcoming-events-heading">
        <div class="container-page">
          <h2 id="upcoming-events-heading" class="font-heading text-2xl md:text-3xl font-semibold text-white mb-8">
            {{ t('events.upcoming') }}
          </h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            <article
              v-for="event in upcomingEvents"
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
                <img
                  :src="event.image"
                  :alt="event.title"
                  loading="lazy"
                  class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                >
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
                <h3
                  class="font-heading text-lg md:text-xl font-semibold text-white mt-2 mb-3
                         group-hover:text-primary-400 transition-colors line-clamp-2"
                >
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
      </section>

      <!-- ── Past events ──────────────────────────────── -->
      <section v-if="pastEvents.length" class="section-py bg-dark-800 border-t border-white/10" aria-labelledby="past-events-heading">
        <div class="container-page">
          <h2 id="past-events-heading" class="font-heading text-2xl md:text-3xl font-semibold text-white mb-8">
            {{ t('events.past') }}
          </h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            <article
              v-for="event in pastEvents"
              :key="event.slug"
              class="group flex flex-col overflow-hidden rounded-2xl bg-white/[0.04]
                     ring-1 ring-white/10 hover:ring-primary-400/50 transition-all duration-300 opacity-80 hover:opacity-100"
            >
              <NuxtLink
                :to="localePath(`/trai-nghiem/${event.slug}`)"
                class="relative block aspect-[16/10] overflow-hidden"
                :aria-label="event.title"
              >
                <img
                  :src="event.image"
                  :alt="event.title"
                  loading="lazy"
                  class="h-full w-full object-cover grayscale-[30%] transition-transform duration-500 group-hover:scale-105"
                >
                <span
                  class="absolute left-4 top-4 inline-flex items-center rounded-full
                         bg-white/20 backdrop-blur px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white shadow"
                >
                  {{ t('events.ended') }}
                </span>
              </NuxtLink>
              <div class="flex flex-1 flex-col p-6">
                <time v-if="event.startAt" class="text-white/40 text-xs uppercase tracking-[0.2em]">
                  {{ formatDate(event.startAt) }}
                </time>
                <h3 class="font-heading text-lg font-semibold text-white mt-2 group-hover:text-primary-400 transition-colors line-clamp-2">
                  <NuxtLink :to="localePath(`/trai-nghiem/${event.slug}`)">
                    {{ event.title }}
                  </NuxtLink>
                </h3>
              </div>
            </article>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>
