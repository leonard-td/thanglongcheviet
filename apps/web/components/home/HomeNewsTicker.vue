<script setup lang="ts">
const { t, locale } = useI18n()
const localePath = useLocalePath()
const { posts: rawPosts, latestPosts } = useBlog()

const sourcePosts = computed(() =>
  latestPosts.value.length ? latestPosts.value : rawPosts.value,
)

const mapPost = (post: { slug: string; image: string; date: string; title: string; excerpt: string }) => {
  const date = new Date(post.date || Date.now())
  return {
    id: post.slug,
    slug: post.slug,
    pinned: false, // Default unless backend provides
    thumbnail: post.image,
    day: date.getDate().toString().padStart(2, '0'),
    month: date.toLocaleDateString(locale.value === 'vi' ? 'vi-VN' : 'en-US', { month: 'short' }).toUpperCase(),
    year: date.getFullYear().toString(),
    category: 'Tin tức',
    title: post.title,
    excerpt: post.excerpt,
  }
}

const allPosts = computed(() => sourcePosts.value.map(mapPost))

const featuredPost = computed(() =>
  allPosts.value.find(p => p.pinned) ?? allPosts.value[0],
)

const tickerPosts = computed(() =>
  allPosts.value.filter(p => p.id !== featuredPost.value?.id),
)

const scrollDuration = computed(() => `${Math.max(tickerPosts.value.length * 5, 24)}s`)
</script>

<template>
  <section class="home-news" aria-labelledby="home-news-heading">
    <div class="container home-news-container">
      <div class="home-news-head">
        <h4>{{ t('blog.eyebrow') }}</h4>
      </div>

      <div v-if="featuredPost" class="home-news-grid">
        <!-- Cột trái ~61.8% — tin ghim -->
        <article class="featured-col">
          <NuxtLink
            :to="localePath(`/tin-tuc/${featuredPost.slug}`)"
            class="featured-card"
          >
            <div class="featured-media">
              <img :src="featuredPost.thumbnail" :alt="featuredPost.title" loading="lazy">
              <span class="featured-badge">{{ t('blog.featured') }}</span>
              <div class="featured-date">
                <span class="day">{{ featuredPost.day }}</span>
                <span class="month">{{ featuredPost.month }}</span>
              </div>
            </div>
            <div class="featured-body">
              <span class="featured-cat">{{ featuredPost.category }}</span>
              <h2 id="home-news-heading" class="featured-title">{{ featuredPost.title }}</h2>
              <p class="featured-excerpt">{{ featuredPost.excerpt }}</p>
            </div>
          </NuxtLink>
        </article>

        <!-- Cột phải ~38.2% — auto-scroll upward -->
        <div class="ticker-col">
          <div class="ticker-viewport">
            <div
              class="ticker-track"
              :style="{ '--ticker-duration': scrollDuration }"
            >
              <ul class="ticker-list">
                <li v-for="post in tickerPosts" :key="post.id" class="ticker-item">
                  <NuxtLink :to="localePath(`/tin-tuc/${post.slug}`)" class="ticker-link">
                    <div class="ticker-thumb">
                      <img :src="post.thumbnail" :alt="post.title" loading="lazy">
                      <div class="ticker-date">
                        <span class="day">{{ post.day }}</span>
                        <span class="month">{{ post.month }}</span>
                      </div>
                    </div>
                    <div class="ticker-body">
                      <span class="ticker-cat">{{ post.category }}</span>
                      <h3 class="ticker-item-title">{{ post.title }}</h3>
                    </div>
                  </NuxtLink>
                </li>
              </ul>
              <ul class="ticker-list" aria-hidden="true">
                <li v-for="post in tickerPosts" :key="`dup-${post.id}`" class="ticker-item">
                  <NuxtLink
                    :to="localePath(`/tin-tuc/${post.slug}`)"
                    class="ticker-link"
                    tabindex="-1"
                  >
                    <div class="ticker-thumb">
                      <img :src="post.thumbnail" alt="" loading="lazy">
                      <div class="ticker-date">
                        <span class="day">{{ post.day }}</span>
                        <span class="month">{{ post.month }}</span>
                      </div>
                    </div>
                    <div class="ticker-body">
                      <span class="ticker-cat">{{ post.category }}</span>
                      <h3 class="ticker-item-title">{{ post.title }}</h3>
                    </div>
                  </NuxtLink>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div class="home-news-more">
        <NuxtLink :to="localePath('/tin-tuc')" class="see-more">
          <span>{{ t('blog.viewAll') }}</span>
          <svg class="see-more-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </NuxtLink>
      </div>
    </div>
  </section>
</template>

<style scoped>
.home-news {
  clear: both;
  display: flow-root;
  position: relative;
  z-index: 2;
  margin-top: 48px;
  margin-bottom: 0;
  padding-bottom: 8px;
}

.home-news-container {
  width: 100%;
  max-width: 100%;
}

.home-news-head {
  text-align: center;
  margin-bottom: 20px;
}

/* Tắt pseudo h2 trang chủ (style.css global) — tránh tràn layout */
.home-news :deep(h2::before),
.home-news :deep(h2::after) {
  display: none;
}

.home-news :deep(h2) {
  position: static;
}

/* Tỉ lệ vàng: 1.618 : 1 — chiều cao cố định, không phụ thuộc ảnh/nội dung */
.home-news-grid {
  --news-block-h: 300px;
  display: grid;
  grid-template-columns: 1.618fr 1fr;
  gap: 14px;
  height: var(--news-block-h);
  align-items: stretch;
  overflow: hidden;
}

.featured-col {
  min-width: 0;
  height: 100%;
}

.featured-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  text-decoration: none;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(20, 28, 22, .65);
  border: 1px solid rgba(201, 168, 108, .28);
  transition: border-color .25s ease, box-shadow .25s ease;
}

.featured-card:hover {
  border-color: rgba(201, 168, 108, .55);
  box-shadow: 0 12px 32px rgba(0, 0, 0, .35);
}

/* Khung ảnh cố định — ảnh fill bằng absolute, không đẩy layout */
.featured-media {
  position: relative;
  flex: 0 0 128px;
  height: 128px;
  overflow: hidden;
  background: #2a3326;
}

.featured-media img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  object-fit: cover;
  object-position: center;
  display: block;
  transition: transform .5s ease;
}

.featured-card:hover .featured-media img {
  transform: scale(1.04);
}

.featured-badge {
  position: absolute;
  top: 12px;
  left: 12px;
  padding: 4px 10px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .14em;
  text-transform: uppercase;
  color: #1a3d2e;
  background: #c9a86c;
  border-radius: 2px;
}

.featured-date {
  position: absolute;
  bottom: 8px;
  right: 8px;
  width: 44px;
  height: 44px;
  background: rgba(26, 61, 46, .88);
  border: 1px solid rgba(201, 168, 108, .45);
  color: #e8d5a8;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.featured-date .day {
  font-size: 15px;
  font-weight: 700;
}

.featured-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  padding: 12px 14px 14px;
  text-align: left;
  display: flex;
  flex-direction: column;
}

.featured-cat {
  display: inline-block;
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: .12em;
  color: #c9a86c;
  margin-bottom: 6px;
  flex-shrink: 0;
}

.featured-title {
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.3;
  margin: 0 0 6px;
  flex-shrink: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.featured-excerpt {
  color: rgba(255, 255, 255, .65);
  font-size: 12px;
  line-height: 1.45;
  margin: 0;
  flex: 1 1 auto;
  min-height: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.featured-date .month {
  font-size: 8px;
  letter-spacing: .08em;
  margin-top: 2px;
}

.ticker-col {
  min-width: 0;
  height: 100%;
}

.ticker-viewport {
  position: relative;
  height: 100%;
  overflow: hidden;
  border-radius: 8px;
  background: rgba(20, 28, 22, .55);
  border: 1px solid rgba(201, 168, 108, .22);
  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, #000 12%, #000 88%, transparent 100%);
  mask-image: linear-gradient(to bottom, transparent 0%, #000 12%, #000 88%, transparent 100%);
}

.ticker-track {
  display: flex;
  flex-direction: column;
  animation: ticker-up var(--ticker-duration, 30s) linear infinite;
}

.ticker-viewport:hover .ticker-track {
  animation-play-state: paused;
}

.ticker-list {
  list-style: none;
  margin: 0;
  padding: 8px 0;
}

.ticker-item {
  padding: 0 8px;
  margin-bottom: 8px;
}

.ticker-link {
  display: flex;
  gap: 8px;
  align-items: center;
  height: 64px;
  text-decoration: none;
  padding: 8px;
  border-radius: 6px;
  background: rgba(42, 51, 38, .65);
  border: 1px solid rgba(255, 255, 255, .06);
  transition: border-color .25s ease, background .25s ease;
  overflow: hidden;
}

.ticker-link:hover {
  border-color: rgba(201, 168, 108, .45);
  background: rgba(42, 51, 38, .9);
}

.ticker-thumb {
  position: relative;
  flex-shrink: 0;
  width: 64px;
  height: 48px;
  border-radius: 4px;
  overflow: hidden;
  background: #2a3326;
}

.ticker-thumb img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  object-fit: cover;
  object-position: center;
  display: block;
}

.ticker-date {
  position: absolute;
  top: 0;
  left: 0;
  width: 28px;
  height: 28px;
  background: #c9a86c;
  color: #1a3d2e;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.ticker-date .day {
  font-size: 10px;
  font-weight: 700;
}

.ticker-body {
  flex: 1;
  min-width: 0;
  text-align: left;
  overflow: hidden;
}

.ticker-cat {
  display: block;
  font-size: 8px;
  text-transform: uppercase;
  letter-spacing: .1em;
  color: #c9a86c;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ticker-item-title {
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.3;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.home-news-more {
  position: relative;
  z-index: 3;
  margin-top: 16px;
  padding: 8px 0 24px;
  text-align: right;
}

.home-news-more .see-more {
  position: relative;
  z-index: 3;
  padding: 10px 4px;
  min-height: 44px;
}

.see-more {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #fff;
  text-decoration: none;
  font-size: 13px;
  letter-spacing: .04em;
  transition: gap .25s ease, opacity .25s ease;
}
.see-more:hover { opacity: .85; gap: 10px; }
.see-more-ic { width: 16px; height: 16px; }

@keyframes ticker-up {
  from { transform: translateY(0); }
  to { transform: translateY(-50%); }
}

.ticker-date .month {
  font-size: 6px;
  letter-spacing: .05em;
  margin-top: 1px;
}

@media (max-width: 767px) {
  .home-news-grid {
    grid-template-columns: 1fr;
    --news-block-h: auto;
    height: auto;
  }

  .featured-col {
    height: auto;
  }

  .featured-card {
    height: 300px;
  }

  .ticker-col {
    height: 260px;
  }

  .ticker-viewport {
    height: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .featured-card:hover .featured-media img {
    transform: none;
  }

  .ticker-track {
    animation: none;
  }

  .ticker-viewport {
    height: auto;
    max-height: none;
    -webkit-mask-image: none;
    mask-image: none;
    overflow: visible;
  }

  .ticker-list[aria-hidden="true"] {
    display: none;
  }
}
</style>
