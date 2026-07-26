<script setup lang="ts">
const { t, locale } = useI18n()
const localePath = useLocalePath()
const { posts } = useBlog()

const newsItems = computed(() =>
  posts.value.slice(0, 8).map((post) => ({
    slug: post.slug,
    title: post.title,
    image: post.image,
    category: post.topic?.name ?? t('blog.eyebrow'),
  })),
)
</script>

<template>
  <div class="home-news-squares" :aria-label="t('blog.title')">
    <NuxtLink
      v-for="item in newsItems"
      :key="item.slug"
      :to="localePath(`/tin-tuc/${item.slug}`)"
      class="preview-link"
    >
      <span class="preview-media">
        <img :src="item.image" class="img-responsive" :alt="item.title">
      </span>
      <span class="pillar-title">
        <span class="pillar-cat">{{ item.category }}</span>
        {{ item.title }}
      </span>
    </NuxtLink>
    <NuxtLink
      v-if="newsItems.length"
      :to="localePath('/tin-tuc')"
      class="home-news-all"
    >
      {{ t('blog.viewAll') }} →
    </NuxtLink>
    <p v-else class="home-news-empty">{{ t('blog.comingSoon') }}</p>
  </div>
</template>

<style scoped>
.home-news-squares {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.home-news-empty {
  margin: 0;
  padding: 24px 16px;
  text-align: center;
  font-size: 12px;
  line-height: 1.5;
  color: rgba(231, 216, 180, 0.75);
  border: 1px dashed rgba(231, 216, 180, 0.25);
  border-radius: 6px;
}

.home-news-all {
  display: block;
  margin-top: 4px;
  padding: 10px 12px;
  text-align: center;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-decoration: none;
  color: #e7d8b4;
  border: 1px solid rgba(231, 216, 180, 0.35);
  border-radius: 6px;
  transition: background 0.2s ease, color 0.2s ease;
}

.home-news-all:hover {
  background: rgba(161, 12, 37, 0.85);
  color: #fff;
  border-color: transparent;
}

.pillar-cat {
  display: block;
  margin-bottom: 4px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #99b521;
}
</style>
