<script setup lang="ts">
// Banner tự render marquee inline ngay dưới nó — layout không chèn ở đầu main
definePageMeta({ bannerMarquee: true })

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
    <!-- -mt-[72px] kéo banner lên dưới header fixed (main có pt-[72px]).
         sticky top-0: banner ghim lại cùng menu khi scroll, nội dung trượt
         phía sau; marquee inline ghim ngay dưới banner. -->
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
            {{ t('blog.topics.postCount', { count: posts.length }) }}
          </p>
        </div>
      </div>

      <!-- Marquee tin tức ghim ngay dưới banner -->
      <HomeNewsMarquee inline />
    </section>

    <!-- ── Posts grid + topics menu ─────────────────── -->
    <section class="section-py bg-dark" aria-labelledby="topic-posts-heading">
      <div class="container-page">
        <h2 id="topic-posts-heading" class="sr-only">{{ topic?.name }}</h2>

        <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-10 xl:gap-14">
        <div class="min-w-0">
        <!-- Loading skeleton -->
        <div v-if="pending" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          <div v-for="n in 6" :key="n"
            class="rounded-2xl overflow-hidden bg-white/[0.04] ring-1 ring-white/10 animate-pulse">
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

        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          <!-- overflow-hidden chỉ đặt trên khung ảnh (không đặt trên card)
               để tooltip của tiêu đề không bị cắt -->
          <article v-for="post in posts" :key="post.slug" class="group flex flex-col rounded-2xl bg-white/[0.04] animate-on-scroll
                   ring-1 ring-white/10 hover:ring-primary-400/50
                   hover:-translate-y-1 hover:shadow-xl hover:shadow-black/30 transition-all duration-300">
            <NuxtLink :to="localePath(`/tin-tuc/${post.slug}`)"
              class="relative block aspect-[16/10] overflow-hidden rounded-t-2xl" :aria-label="post.title">
              <img :src="post.image" :alt="post.title" loading="lazy"
                class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105">
            </NuxtLink>

            <div class="flex flex-1 flex-col p-4">
              <!-- <time class="text-primary-400 text-xs uppercase tracking-[0.2em]">{{ post.dateLabel }}</time> -->
              <h3 class="font-heading text-base font-semibold text-white mt-2 mb-2
                       group-hover:text-primary-400 transition-colors">
                <WidgetsTooltip :text="post.title" placement="top" multiline class="w-full min-w-0">
                  <NuxtLink :to="localePath(`/tin-tuc/${post.slug}`)" class="block w-full truncate">
                    {{ post.title }}
                  </NuxtLink>
                </WidgetsTooltip>
              </h3>
              <WidgetsTooltip :text="post.title" placement="top" multiline class="w-full min-w-0">
                <p class="text-white/50 text-xs leading-relaxed line-clamp-1">
                  {{ post.excerpt }}
                </p>
              </WidgetsTooltip>
              <NuxtLink :to="localePath(`/tin-tuc/${post.slug}`)" class="mt-auto pt-3 inline-flex items-center gap-1.5 text-primary-400 text-xs
                       font-condensed tracking-[0.15em] hover:text-primary-300 transition-colors">
                {{ t('blog.readMore') }}
                <svg class="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
          :aria-label="t('blog.topics.browse')"
        >
          <h2 class="mb-4 flex items-center gap-2 font-heading text-lg font-semibold text-white">
            <span class="h-[2px] w-6 bg-primary-400 inline-block flex-none" />
            <span class="truncate">{{ t('blog.topics.browse') }}</span>
          </h2>
          <nav class="rounded-2xl bg-white/[0.03] ring-1 ring-white/10 overflow-hidden">
            <ul>
              <li
                v-for="item in topics"
                :key="item.id"
                class="border-b border-white/5 last:border-0"
              >
                <NuxtLink
                  :to="localePath(`/tin-tuc/chu-de/${item.slug}`)"
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
