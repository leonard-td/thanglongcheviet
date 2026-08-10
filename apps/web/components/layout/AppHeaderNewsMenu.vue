<script setup lang="ts">
import { FALLBACK_POST_IMAGE } from '~/utils/storefront'

interface NavChildLink {
  key: string
  path: string
  label?: string
  openInNewTab?: boolean
}

defineProps<{
  children: NavChildLink[]
}>()

const { t } = useI18n()
const localePath = useLocalePath()

// Chủ đề (campaign-topics, content_type="post") — admin-managed, real
// backend entity, same shape as products' categories/collections.
const { topics, pending: topicsPending } = useBlogTopics()

// Featured banner: bài viết mới nhất thay cho 1 card tĩnh — luôn phản ánh
// đúng nội dung mới nhất mà không cần đụng code hay Cards.
const { latestPosts, pending: postsPending } = useBlog()
const featuredPost = computed(() => latestPosts.value[0] ?? null)

const pending = computed(() => topicsPending.value || postsPending.value)
</script>

<template>
  <div class="news-mega">
    <!-- Loading skeleton -->
    <div v-if="pending" class="news-mega-grid">
      <div v-for="n in 6" :key="n" class="news-mega-skeleton">
        <div class="news-mega-skeleton-thumb" />
        <div class="news-mega-skeleton-line" />
      </div>
    </div>

    <template v-else>
      <NuxtLink
        v-if="featuredPost"
        :to="localePath(`/tin-tuc/${featuredPost.slug}`)"
        class="news-mega-feature"
      >
        <img :src="featuredPost.image" :alt="featuredPost.title" loading="lazy">
        <span class="news-mega-feature-overlay">
          <span class="news-mega-feature-eyebrow">{{ t('blog.featured') }}</span>
          <span class="news-mega-feature-title">{{ featuredPost.title }}</span>
        </span>
      </NuxtLink>

      <div v-if="topics.length" class="news-mega-section">
        <span class="news-mega-title">{{ t('blog.topics.eyebrow') }}</span>
        <div class="news-mega-grid">
          <NuxtLink
            v-for="topic in topics"
            :key="topic.id"
            :to="localePath(`/tin-tuc/chu-de/${topic.slug}`)"
            class="news-mega-item"
          >
            <span class="news-mega-thumb">
              <img :src="topic.image || FALLBACK_POST_IMAGE" :alt="topic.name" loading="lazy">
            </span>
            <span class="news-mega-label">{{ topic.name }}</span>
          </NuxtLink>
        </div>
      </div>

      <div class="news-mega-section news-mega-links">
        <span class="news-mega-title">{{ t('nav.blogMenu.moreTitle') }}</span>
        <NuxtLink
          v-for="child in children"
          :key="child.key"
          :to="localePath(child.path)"
          class="news-mega-textlink"
          :target="child.openInNewTab ? '_blank' : undefined"
          :rel="child.openInNewTab ? 'noopener noreferrer' : undefined"
        >
          {{ child.label || t(child.key) }}
        </NuxtLink>
        <NuxtLink :to="localePath('/tin-tuc')" class="news-mega-textlink news-mega-textlink-cta">
          {{ t('blog.viewAll') }}
        </NuxtLink>
      </div>
    </template>
  </div>
</template>

<style scoped>
.news-mega {
  display: flex;
  flex-wrap: wrap;
  gap: 1.75rem 2.5rem;
  min-width: min(640px, 90vw);
  max-width: 820px;
  padding: 1.5rem 1.75rem;
}

.news-mega-section {
  flex: 1 1 220px;
}

.news-mega-feature {
  position: relative;
  flex: 0 0 168px;
  min-height: 220px;
  border-radius: .75rem;
  overflow: hidden;
  display: block;
  background: #24331f;
}

.news-mega-feature img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  position: absolute;
  inset: 0;
  transition: transform .4s ease;
}

.news-mega-feature:hover img {
  transform: scale(1.06);
}

.news-mega-feature-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: .25rem;
  padding: 1rem;
  background: linear-gradient(to top, rgba(0, 0, 0, .85), rgba(0, 0, 0, 0) 65%);
}

.news-mega-feature-eyebrow {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .12em;
  color: #dda04d;
}

.news-mega-feature-title {
  font-size: 13px;
  font-weight: 700;
  line-height: 1.35;
  color: #f5f0e6;
}

.news-mega-title {
  display: block;
  margin-bottom: .85rem;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .12em;
  color: rgba(232, 213, 168, .8);
  border-bottom: 1px solid rgba(201, 168, 108, .18);
  padding-bottom: .5rem;
}

.news-mega-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(78px, 1fr));
  gap: 1rem .75rem;
}

.news-mega-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: .5rem;
  text-align: center;
  text-decoration: none;
  padding: .35rem;
  border-radius: .5rem;
  transition: background .15s ease;
}

.news-mega-item:hover {
  background: rgba(201, 168, 108, .08);
}

.news-mega-thumb {
  display: block;
  width: 64px;
  height: 64px;
  border-radius: .65rem;
  overflow: hidden;
  background: #24331f;
  border: 1px solid rgba(255, 255, 255, .08);
  transition: border-color .15s ease;
}

.news-mega-item:hover .news-mega-thumb {
  border-color: rgba(201, 168, 108, .55);
}

.news-mega-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.news-mega-label {
  font-size: 11px;
  line-height: 1.3;
  color: rgba(245, 240, 230, .82);
  transition: color .15s ease;
}

.news-mega-item:hover .news-mega-label {
  color: #e8d5a8;
}

.news-mega-links {
  flex: 1 1 200px;
  display: flex;
  flex-direction: column;
}

.news-mega-textlink {
  padding: .55rem 0;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: .1em;
  color: rgba(245, 240, 230, .82);
  text-decoration: none;
  border-bottom: 1px solid rgba(255, 255, 255, .06);
  transition: color .15s ease;
}

.news-mega-textlink:hover {
  color: #e8d5a8;
}

.news-mega-textlink-cta {
  margin-top: .75rem;
  border: none;
  color: #dda04d;
  font-weight: 700;
}

.news-mega-skeleton {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: .5rem;
}

.news-mega-skeleton-thumb {
  width: 64px;
  height: 64px;
  border-radius: .65rem;
  background: rgba(255, 255, 255, .06);
  animation: news-mega-pulse 1.4s ease-in-out infinite;
}

.news-mega-skeleton-line {
  width: 70%;
  height: 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, .06);
  animation: news-mega-pulse 1.4s ease-in-out infinite;
}

@keyframes news-mega-pulse {
  0%, 100% { opacity: .5; }
  50% { opacity: 1; }
}
</style>
