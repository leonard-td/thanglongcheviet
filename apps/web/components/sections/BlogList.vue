<script setup lang="ts">
const props = defineProps<{
  eyebrow?: string
  title?: string
  subtitle?: string
}>()

const { t, locale } = useI18n()
const localePath = useLocalePath()
const { posts: rawPosts, pending } = useBlog()

const posts = computed(() =>
  rawPosts.value.map((post) => {
    const date = new Date(post.date || Date.now())
    return {
      id: post.slug,
      slug: post.slug,
      dateLabel: date.toLocaleDateString(locale.value === 'vi' ? 'vi-VN' : 'en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      title: post.title,
      excerpt: post.excerpt,
      image: post.image,
      topic: post.topic,
    }
  }),
)
</script>

<template>
  <section class="section-py bg-dark-800 text-white" aria-labelledby="blog-list-heading">
    <div class="container-page">
      <div v-if="props.title" class="text-center mb-10 md:mb-14 animate-on-scroll">
        <h2 id="blog-list-heading" class="section-heading text-white mb-4">{{ props.title }}</h2>
        <div class="divider-gold" />
        <p v-if="props.subtitle" class="section-subheading mt-4 max-w-2xl mx-auto">{{ props.subtitle }}</p>
      </div>
      <h2 v-else id="blog-list-heading" class="sr-only">{{ t('blog.title') }}</h2>

      <!-- Loading skeleton -->
      <div v-if="pending" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
        <div v-for="n in 8" :key="n" class="rounded-2xl overflow-hidden bg-white/5 animate-pulse">
          <div class="aspect-[16/10]" />
          <div class="p-4 space-y-3">
            <div class="h-3 w-24 rounded bg-white/10" />
            <div class="h-5 w-3/4 rounded bg-white/10" />
            <div class="h-3 w-full rounded bg-white/10" />
          </div>
        </div>
      </div>

      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
        <!-- overflow-hidden chỉ đặt trên khung ảnh (không đặt trên card)
             để tooltip của tiêu đề không bị cắt -->
        <article
          v-for="post in posts"
          :key="post.id"
          class="group flex flex-col rounded-2xl bg-white/[0.04] animate-on-scroll
                 ring-1 ring-white/10 hover:ring-primary-400/50
                 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/30
                 transition-all duration-300"
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
            <!-- Nhãn chủ đề đã ẩn trên danh sách bài viết theo yêu cầu UI -->
          </NuxtLink>

          <div class="flex flex-1 flex-col p-4">
            <time class="text-primary-400 text-xs uppercase tracking-[0.2em]">{{ post.dateLabel }}</time>
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
</template>
