<script setup lang="ts">
const { t, locale } = useI18n()
const route = useRoute()
const localePath = useLocalePath()
const { site } = useSettings()
const { topics, getTopicBySlug, getPostsByTopicSlug } = useBlogTopics()

useScrollAnimation()

const slug = computed(() => String(route.params.slug))

const { data, pending } = useAsyncData(
  () => `topic-${slug.value}`,
  async () => {
    const [topic, posts] = await Promise.all([
      getTopicBySlug(slug.value),
      getPostsByTopicSlug(slug.value),
    ])
    return { topic, posts }
  },
  { watch: [slug] },
)

watchEffect(() => {
  if (!pending.value && !data.value?.topic) {
    throw createError({ statusCode: 404, statusMessage: 'Topic not found', fatal: true })
  }
})

// Banner full-bleed: header trong suốt nằm đè lên banner, chuyển nền đặc
// khi scroll hết banner (xem composables/useHeaderBanner.ts)
const bannerEl = ref<HTMLElement | null>(null)
useBannerHeader(bannerEl)

const topic = computed(() => data.value?.topic ?? null)
const posts = computed(() =>
  (data.value?.posts ?? []).map((post) => {
    const date = new Date(post.date || Date.now())
    return {
      ...post,
      dateLabel: date.toLocaleDateString(locale.value === 'vi' ? 'vi-VN' : 'en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
    }
  }),
)

useSeoMeta({
  title: () => `${topic.value?.name ?? ''} | ${t('nav.blog')} | ${site.value.name}`,
  description: () => topic.value?.description || t('blog.subtitle'),
  ogImage: () => topic.value?.image || undefined,
})
</script>

<template>
  <div class="bg-dark min-h-[60vh]">
    <!-- ── Topic banner ─────────────────────────────── -->
    <!-- -mt-[72px] kéo banner lên dưới header fixed (main có pt-[72px]) -->
    <section ref="bannerEl" class="relative -mt-[72px] bg-dark text-white">
      <div class="relative h-[210px] sm:h-[250px] md:h-[310px] overflow-hidden">
        <img
          v-if="topic?.image"
          :src="topic.image"
          :alt="topic?.name || ''"
          class="absolute inset-0 h-full w-full object-cover"
        >
        <div v-else class="absolute inset-0 bg-gradient-to-br from-primary-800 via-dark-700 to-dark" />
        <div class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20" />

        <div class="relative h-full container-page flex flex-col justify-end pb-8 md:pb-12">

          <h1 class="font-heading text-3xl sm:text-4xl md:text-5xl font-bold max-w-3xl">
            {{ topic?.name }}
          </h1>
          <p
            v-if="topic?.description"
            class="mt-3 max-w-2xl text-sm md:text-base text-white/80 leading-relaxed"
          >
            {{ topic.description }}
          </p>
          <p class="mt-4 inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-primary-300">
            <span class="h-[2px] w-8 bg-primary-400 inline-block" />
            {{ t('blog.topics.postCount', { count: posts.length }) }}
          </p>
        </div>
      </div>
    </section>

    <!-- ── Topic switcher ───────────────────────────── -->
    <div v-if="topics.length > 1" class="border-b border-white/10 bg-dark-800">
      <div class="container-page py-4 flex flex-wrap items-center gap-2">
        <span class="text-xs uppercase tracking-[0.2em] text-white/50 mr-1">
          {{ t('blog.topics.browse') }}
        </span>
        <NuxtLink
          v-for="item in topics"
          :key="item.id"
          :to="localePath(`/tin-tuc/chu-de/${item.slug}`)"
          class="rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors"
          :class="item.slug === slug
            ? 'bg-primary-500 text-white shadow'
            : 'bg-white/5 text-white/60 hover:bg-primary-500/20 hover:text-primary-300'"
        >
          {{ item.name }}
        </NuxtLink>
      </div>
    </div>

    <!-- ── Posts grid ───────────────────────────────── -->
    <section class="section-py bg-dark" aria-labelledby="topic-posts-heading">
      <div class="container-page">
        <h2 id="topic-posts-heading" class="sr-only">{{ topic?.name }}</h2>

        <!-- Loading skeleton -->
        <div v-if="pending" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
          <div v-for="n in 8" :key="n" class="rounded-2xl overflow-hidden bg-white/[0.04] ring-1 ring-white/10 animate-pulse">
            <div class="aspect-[16/10] bg-white/5" />
            <div class="p-4 space-y-3">
              <div class="h-3 w-24 rounded bg-white/10" />
              <div class="h-5 w-3/4 rounded bg-white/10" />
              <div class="h-3 w-full rounded bg-white/10" />
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div v-else-if="!posts.length" class="py-8 text-center">
          <p class="font-heading text-xl text-white mb-2">{{ t('blog.topics.emptyTitle') }}</p>
          <p class="text-sm text-white/60 mb-8">{{ t('blog.topics.emptyDesc') }}</p>
          <NuxtLink :to="localePath('/tin-tuc')" class="btn-primary">
            {{ t('blog.viewAll') }}
          </NuxtLink>
        </div>

        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
          <!-- overflow-hidden chỉ đặt trên khung ảnh (không đặt trên card)
               để tooltip của tiêu đề không bị cắt -->
          <article
            v-for="post in posts"
            :key="post.slug"
            class="group flex flex-col rounded-2xl bg-white/[0.04] animate-on-scroll
                   ring-1 ring-white/10 hover:ring-primary-400/50
                   hover:-translate-y-1 hover:shadow-xl hover:shadow-black/30 transition-all duration-300"
          >
            <NuxtLink
              :to="localePath(`/tin-tuc/${post.slug}`)"
              class="relative block aspect-[16/10] overflow-hidden rounded-t-2xl"
              :aria-label="post.title"
            >
              <img
                :src="post.image"
                :alt="post.title"
                loading="lazy"
                class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              >
            </NuxtLink>

            <div class="flex flex-1 flex-col p-4">
              <!-- <time class="text-primary-400 text-xs uppercase tracking-[0.2em]">{{ post.dateLabel }}</time> -->
              <h3
                class="font-heading text-base font-semibold text-white mt-2 mb-2
                       group-hover:text-primary-400 transition-colors"
              >
                <WidgetsTooltip :text="post.title" placement="top" multiline class="w-full min-w-0">
                  <NuxtLink :to="localePath(`/tin-tuc/${post.slug}`)" class="block w-full truncate">
                    {{ post.title }}
                  </NuxtLink>
                </WidgetsTooltip>
              </h3>
              <p class="text-white/50 text-sm leading-relaxed line-clamp-2">
                {{ post.excerpt }}
              </p>
              <NuxtLink
                :to="localePath(`/tin-tuc/${post.slug}`)"
                class="mt-auto pt-3 inline-flex items-center gap-1.5 text-primary-400 text-xs
                       font-condensed uppercase tracking-[0.15em] hover:text-primary-300 transition-colors"
              >
                {{ t('blog.readMore') }}
                <svg class="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </NuxtLink>
            </div>
          </article>
        </div>
      </div>
    </section>
  </div>
</template>
