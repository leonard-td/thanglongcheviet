<script setup lang="ts">
const { t, locale } = useI18n()
const localePath = useLocalePath()
const { posts: rawPosts } = useBlog()

const posts = computed(() =>
  rawPosts.value.slice(0, 4).map((post) => {
    const date = new Date(post.date || Date.now())
    return {
      id: post.slug,
      slug: post.slug,
      thumbnail: post.image,
      category: 'Tin tức', // post category not available in basic api yet
      day: date.getDate().toString().padStart(2, '0'),
      month: date.toLocaleDateString(locale.value === 'vi' ? 'vi-VN' : 'en-US', { month: 'short' }).toUpperCase(),
      title: post.title,
      excerpt: post.excerpt,
    }
  }),
)
</script>

<template>
  <section class="section-py bg-[#1a1a1a] text-white" aria-labelledby="blog-heading">
    <div class="container-page">

      <!-- Header row -->
      <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10 md:mb-14 animate-on-scroll">
        <div>
          <p class="modis-eyebrow mb-2">
            {{ t('blog.eyebrow') }}
          </p>
          <h2 id="blog-heading" class="section-heading text-white">
            {{ t('blog.title') }}
          </h2>
          <div class="divider-gold mt-4" style="margin-left:0;margin-right:auto;" />
        </div>
        <NuxtLink
          :to="localePath('/tin-tuc')"
          class="btn-ghost text-xs self-start sm:self-end"
        >
          {{ t('blog.viewAll') }}
        </NuxtLink>
      </div>

      <!-- 4-column blog grid (Modis style) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <article
          v-for="post in posts"
          :key="post.id"
          class="group flex flex-col bg-[#27282b] border border-white/5
                 hover:border-primary-500/30 transition-all duration-300 animate-on-scroll"
        >
          <!-- Thumbnail + date badge overlay -->
          <div class="relative overflow-hidden aspect-[4/3] flex-shrink-0">
            <img
              :src="post.thumbnail"
              :alt="post.title"
              class="w-full h-full object-cover transition-transform duration-500
                     group-hover:scale-105"
              loading="lazy"
            />

            <!-- Date badge (Modis style: gold square top-left) -->
            <div
              class="absolute top-0 left-0 w-14 h-14 md:w-16 md:h-16
                     bg-primary-500 flex flex-col items-center justify-center text-white"
            >
              <span class="text-xl md:text-2xl font-bold leading-none font-heading">{{ post.day }}</span>
              <span class="text-[9px] md:text-[10px] tracking-[0.15em] uppercase mt-0.5">{{ post.month }}</span>
            </div>

            <!-- Category badge -->
            <div
              class="absolute bottom-0 right-0
                     bg-black/70 text-primary-400 text-[10px] font-condensed
                     uppercase tracking-widest px-2.5 py-1"
            >
              {{ post.category }}
            </div>
          </div>

          <!-- Content -->
          <div class="flex flex-col flex-1 p-5">
            <h3 class="font-heading text-base font-semibold text-white leading-snug mb-3
                       group-hover:text-primary-400 transition-colors line-clamp-2">
              <NuxtLink :to="localePath(`/tin-tuc/${post.slug}`)">
                {{ post.title }}
              </NuxtLink>
            </h3>
            <p class="text-white/50 text-xs leading-relaxed mb-4 flex-1 line-clamp-3">
              {{ post.excerpt }}
            </p>
            <NuxtLink
              :to="localePath(`/tin-tuc/${post.slug}`)"
              class="inline-flex items-center gap-1.5 text-primary-400 text-xs
                     font-condensed uppercase tracking-wider
                     hover:gap-3 transition-all duration-200"
            >
              {{ t('common.viewMore') }}
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </NuxtLink>
          </div>
        </article>
      </div>

    </div>
  </section>
</template>
