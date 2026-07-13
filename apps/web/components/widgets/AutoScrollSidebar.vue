<script setup lang="ts">
export interface AutoScrollSidebarItem {
  key: string
  to: string
  image?: string
  title: string
  subtitle?: string
}

const props = defineProps<{
  items: AutoScrollSidebarItem[]
  ariaLabel?: string
}>()

// Chỉ chạy marquee khi đủ dài để cuộn tuần hoàn liền mạch; ít mục thì
// hiển thị danh sách tĩnh.
const shouldMarquee = computed(() => props.items.length >= 4)

// Khung marquee không được cao hơn 1 bản danh sách, nếu không vòng lặp sẽ
// hở khoảng trống — đo chiều cao thật của bản gốc và cap ở 480px.
const marqueeListEl = ref<HTMLElement | null>(null)
const { height: marqueeListHeight } = useElementSize(marqueeListEl)
const marqueeStyle = computed(() => {
  if (!shouldMarquee.value) return {}
  const height = marqueeListHeight.value
    ? Math.min(marqueeListHeight.value, 480)
    : 480
  return {
    height: `${height}px`,
    '--marquee-duration': `${props.items.length * 6}s`,
  }
})
</script>

<template>
  <div
    class="topic-marquee rounded-2xl bg-white/[0.03] ring-1 ring-white/10"
    :class="{ 'is-static': !shouldMarquee }"
    :style="marqueeStyle"
    :aria-label="ariaLabel"
  >
    <div class="topic-marquee-track">
      <ul ref="marqueeListEl">
        <li
          v-for="item in items"
          :key="item.key"
          class="border-b border-white/5 last:border-0"
        >
          <NuxtLink
            :to="item.to"
            class="group flex gap-3 p-3 transition-colors hover:bg-white/[0.05]"
          >
            <img
              v-if="item.image"
              :src="item.image"
              :alt="item.title"
              loading="lazy"
              class="h-16 w-24 flex-none rounded-lg object-cover ring-1 ring-white/10"
            >
            <div class="min-w-0">
              <h3 class="text-sm font-semibold leading-snug text-white line-clamp-2 group-hover:text-primary-400 transition-colors">
                {{ item.title }}
              </h3>
              <span
                v-if="item.subtitle"
                class="mt-1.5 block text-[11px] uppercase tracking-[0.15em] text-primary-400/90"
              >
                {{ item.subtitle }}
              </span>
            </div>
          </NuxtLink>
        </li>
      </ul>
      <!-- Bản nhân đôi để vòng lặp cuộn liền mạch; ẩn với trình đọc màn hình
           và loại khỏi tab order -->
      <ul v-if="shouldMarquee" aria-hidden="true" inert>
        <li
          v-for="item in items"
          :key="`clone-${item.key}`"
          class="border-b border-white/5 last:border-0"
        >
          <NuxtLink
            :to="item.to"
            class="group flex gap-3 p-3 transition-colors hover:bg-white/[0.05]"
            tabindex="-1"
          >
            <img
              v-if="item.image"
              :src="item.image"
              :alt="''"
              loading="lazy"
              class="h-16 w-24 flex-none rounded-lg object-cover ring-1 ring-white/10"
            >
            <div class="min-w-0">
              <h3 class="text-sm font-semibold leading-snug text-white line-clamp-2 group-hover:text-primary-400 transition-colors">
                {{ item.title }}
              </h3>
              <span
                v-if="item.subtitle"
                class="mt-1.5 block text-[11px] uppercase tracking-[0.15em] text-primary-400/90"
              >
                {{ item.subtitle }}
              </span>
            </div>
          </NuxtLink>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
/*
 * Danh sách cuộn dọc tuần hoàn từ dưới lên. Track gồm 2 bản danh sách xếp
 * chồng; translateY(-50%) đúng bằng chiều cao 1 bản nên vòng lặp liền mạch.
 * Hover/focus thì dừng để đọc & bấm.
 */
.topic-marquee {
  /* chiều cao đặt qua inline style (đo theo 1 bản danh sách, cap 480px) */
  overflow: hidden;
}
.topic-marquee-track {
  display: flex;
  flex-direction: column;
  animation: topic-marquee-up var(--marquee-duration, 40s) linear infinite;
  will-change: transform;
}
.topic-marquee.is-static .topic-marquee-track {
  animation: none;
}
.topic-marquee:hover .topic-marquee-track,
.topic-marquee:focus-within .topic-marquee-track {
  animation-play-state: paused;
}
@keyframes topic-marquee-up {
  from { transform: translateY(0); }
  to { transform: translateY(-50%); }
}
@media (prefers-reduced-motion: reduce) {
  .topic-marquee-track {
    animation: none !important;
  }
  .topic-marquee {
    overflow-y: auto;
  }
  .topic-marquee-track ul[aria-hidden='true'] {
    display: none;
  }
}
</style>
