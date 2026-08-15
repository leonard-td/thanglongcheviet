<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const { topics, pending } = useBlogTopics()
</script>

<template>
  <section
    v-if="pending || topics.length"
    class="section-py bg-dark text-white"
    aria-labelledby="blog-topics-heading"
  >
    <div class="container-page">
      <!-- <div class="text-center mb-10 md:mb-14 animate-on-scroll">
        <h2 id="blog-topics-heading" class="section-heading text-white mb-4">
          {{ t('blog.topics.title') }}
        </h2>
        <div class="divider-gold" />
        <p class="section-subheading mt-4 max-w-2xl mx-auto">
          {{ t('blog.topics.subtitle') }}
        </p>
      </div> -->

      <!-- Loading skeleton -->
      <div v-if="pending" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
        <div
          v-for="n in 4"
          :key="n"
          class="aspect-[4/3] rounded-2xl bg-white/5 animate-pulse"
        />
      </div>

      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
        <NuxtLink
          v-for="topic in topics"
          :key="topic.id"
          :to="localePath(`/tin-tuc/chu-de/${topic.slug}`)"
          class="group relative block aspect-[4/3] overflow-hidden rounded-2xl animate-on-scroll
                 ring-1 ring-white/10 hover:ring-primary-400/60 transition-shadow duration-300"
        >
          <img
            v-if="topic.image"
            :src="topic.image"
            :alt="topic.name"
            loading="lazy"
            class="absolute inset-0 h-full w-full object-cover
                   transition-transform duration-500 group-hover:scale-105"
          >
          <div
            v-else
            class="absolute inset-0 bg-gradient-to-br from-primary-700 to-dark-700"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
          <div class="absolute inset-x-0 bottom-0 p-5">
            <h3 class="font-heading text-lg md:text-xl font-semibold text-white group-hover:text-primary-300 transition-colors">
              {{ topic.name }}
            </h3>
            <p class="mt-1 text-xs uppercase tracking-[0.2em] text-white/70">
              {{ t('blog.topics.postCount', { count: topic.post_count ?? 0 }) }}
            </p>
          </div>
        </NuxtLink>
      </div>
    </div>
  </section>
</template>
