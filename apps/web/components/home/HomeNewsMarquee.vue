<script setup lang="ts">
// inline: nằm trong luồng trang (dưới banner / đầu main) thay vì fixed top —
// dùng trên mọi trang ngoài trang chủ; trang chủ giữ biến thể fixed.
const props = withDefaults(defineProps<{ inline?: boolean }>(), {
  inline: false,
})

const { t, locale } = useI18n()
const localePath = useLocalePath()
const { posts: rawPosts, latestPosts } = useBlog()

const items = computed(() =>
  (latestPosts.value.length ? latestPosts.value : rawPosts.value).map(post => ({
    id: post.slug,
    slug: post.slug,
    title: post.title,
    category: 'Tin tức', // Fallback
  })),
)

const duration = computed(() => `${Math.max(items.value.length * 8, 32)}s`)
</script>

<template>
  <div
    class="home-marquee"
    :class="{ 'is-inline': props.inline }"
    role="region"
    :aria-label="t('site.name')"
  >
    <div class="home-marquee-brand">
      <LayoutSiteLogo variant="marquee" />
    </div>
    <div class="home-marquee-viewport">
      <div
        class="home-marquee-track"
        :style="{ '--marquee-duration': duration }"
      >
        <ul class="home-marquee-list">
          <li v-for="post in items" :key="post.id" class="home-marquee-item">
            <NuxtLink :to="localePath(`/tin-tuc/${post.slug}`)" class="home-marquee-link">
              <span class="home-marquee-cat">{{ post.category }}</span>
              <span class="home-marquee-title">{{ post.title }}</span>
            </NuxtLink>
          </li>
        </ul>
        <ul class="home-marquee-list" aria-hidden="true">
          <li v-for="post in items" :key="`dup-${post.id}`" class="home-marquee-item">
            <NuxtLink
              :to="localePath(`/tin-tuc/${post.slug}`)"
              class="home-marquee-link"
              tabindex="-1"
            >
              <span class="home-marquee-cat">{{ post.category }}</span>
              <span class="home-marquee-title">{{ post.title }}</span>
            </NuxtLink>
          </li>
        </ul>
      </div>
    </div>
    <WidgetsLangSwitch v-if="!props.inline" />
  </div>
</template>

<style scoped>
.home-marquee {
  --marquee-h: 34px;
  --site-marquee-h: var(--marquee-h);
  --marquee-red: #a10c25;
  --marquee-red-dark: #9b0c24;
  --marquee-gray: #5a5a5a;
  --marquee-gray-dark: #3d3d3d;
  --marquee-text: #ffffff;
  --marquee-text-green: #99b521;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 960;
  height: var(--marquee-h);
  display: flex;
  align-items: stretch;
  border-bottom: 2px solid var(--marquee-red);
  overflow: hidden;
  background: linear-gradient(90deg, var(--marquee-gray) 0%, var(--marquee-gray-dark) 100%);
}

.home-marquee-brand {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  padding: 0 5px;
  /* background: linear-gradient(180deg, var(--marquee-red) 0%, var(--marquee-red-dark) 100%); */
  background-color: #ffffff;
  border-right: 2px solid #4f4f4f;
  --border-radius-left: 0px;  
  --border-radius-right: 5px;
  border-top-right-radius: var(--border-radius-right);
  border-bottom-right-radius: var(--border-radius-right); 
  border-top-left-radius: var(--border-radius-left);
  border-bottom-left-radius: var(--border-radius-left);
}

.home-marquee-viewport {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  display: flex;
  align-items: center;
  
}

.home-marquee-viewport:hover .home-marquee-track {
  animation-play-state: paused;
}

.home-marquee-track {
  display: flex;
  width: max-content;
  animation: marquee-rtl var(--marquee-duration, 40s) linear infinite;
}

.home-marquee-list {
  display: flex;
  align-items: center;
  list-style: none;
  margin: 0;
  padding: 0;
}

.home-marquee-item {
  flex-shrink: 0;
  padding: 0 20px;
}

.home-marquee-item:not(:last-child) {
  border-right: 1px solid rgba(255, 255, 255, .18);
}

.home-marquee-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  font-size: 12px;
  line-height: 1;
  white-space: nowrap;
  transition: opacity .2s ease;
}

.home-marquee-link:hover {
  opacity: .92;
}

.home-marquee-cat {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .1em;
  color: var(--marquee-text-green);
}

.home-marquee-title {
  font-weight: 600;
  color: var(--marquee-text);
}

.home-marquee-link:hover .home-marquee-cat {
  color: #ff6b6b;
}

.home-marquee-link:hover .home-marquee-title {
  color: var(--marquee-text);
  text-decoration: underline;
  text-underline-offset: 2px;
}

/* Biến thể inline: nằm trong luồng trang thay vì ghim fixed lên đầu viewport */
.home-marquee.is-inline {
  position: relative;
  top: auto;
  left: auto;
  right: auto;
  z-index: 30;
}

@keyframes marquee-rtl {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}

@media (max-width: 639px) {
  .home-marquee {
    --marquee-h: 32px;
  }

  .home-marquee-brand {
    padding: 0 8px;
  }

  .home-marquee-item {
    padding: 0 14px;
  }

  .home-marquee-link {
    font-size: 11px;
  }
}

@media (prefers-reduced-motion: reduce) {
   .home-marquee-list[aria-hidden="true"] {
    display: none;
  }
}
</style>
