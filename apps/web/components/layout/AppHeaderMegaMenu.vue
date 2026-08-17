<script setup lang="ts">
// Shared presentational shell for the header's image-tile mega menus
// component owns layout/markup/CSS only — each caller keeps its own data
// fetching (different backend entities per menu) and just hands over
// `sections` already shaped for display. Adding a new mega menu type later
// means writing a small data-only component that renders this one, not
// copy-pasting a ~260-line file.
export interface MegaMenuItem {
  key: string
  path: string
  label: string
  image: string
  openInNewTab?: boolean
}

export interface MegaMenuSection {
  key: string
  title: string
  items: MegaMenuItem[]
}

withDefaults(defineProps<{
  sections: MegaMenuSection[]
  loading?: boolean
  skeletonCount?: number
  viewAllPath: string
  viewAllLabel: string
  viewAllIcon?: boolean
  minWidth?: string
  maxWidth?: string
}>(), {
  loading: false,
  skeletonCount: 6,
  viewAllIcon: true,
  minWidth: 'min(640px, 90vw)',
  maxWidth: '820px',
})

const localePath = useLocalePath()
</script>

<template>
  <div class="mega-menu" :style="{ minWidth, maxWidth }">
    <div v-if="loading" class="mega-menu-section">
      <div class="mega-menu-grid">
        <div v-for="n in skeletonCount" :key="n" class="mega-menu-skeleton">
          <div class="mega-menu-skeleton-thumb" />
          <div class="mega-menu-skeleton-line" />
        </div>
      </div>
    </div>

    <template v-else>
      <div v-for="section in sections" :key="section.key" class="mega-menu-section">
        <span class="mega-menu-title">{{ section.title }}</span>
        <div class="mega-menu-grid">
          <NuxtLink
            v-for="item in section.items"
            :key="item.key"
            :to="localePath(item.path)"
            class="mega-menu-item"
            :target="item.openInNewTab ? '_blank' : undefined"
            :rel="item.openInNewTab ? 'noopener noreferrer' : undefined"
          >
            <span class="mega-menu-thumb">
              <img :src="item.image" :alt="item.label" loading="lazy">
            </span>
            <span class="mega-menu-label">{{ item.label }}</span>
          </NuxtLink>
        </div>
      </div>

      <div class="mega-menu-footer">
        <NuxtLink :to="localePath(viewAllPath)" class="mega-menu-viewall">
          {{ viewAllLabel }}
          <svg v-if="viewAllIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="m9 6 6 6-6 6" />
          </svg>
        </NuxtLink>
      </div>
    </template>
  </div>
</template>

<style scoped>
.mega-menu {
  display: flex;
  flex-wrap: wrap;
  gap: 1.75rem 2.5rem;
  padding: 1.5rem 1.75rem;
}

.mega-menu-section {
  flex: 1 1 220px;
}

.mega-menu-title {
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

.mega-menu-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(78px, 1fr));
  gap: 1rem .75rem;
}

.mega-menu-item {
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

.mega-menu-item:hover {
  background: rgba(201, 168, 108, .08);
}

.mega-menu-thumb {
  display: block;
  width: 64px;
  height: 64px;
  border-radius: .65rem;
  overflow: hidden;
  background: #24331f;
  border: 1px solid rgba(255, 255, 255, .08);
  transition: border-color .15s ease;
}

.mega-menu-item:hover .mega-menu-thumb {
  border-color: rgba(201, 168, 108, .55);
}

.mega-menu-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.mega-menu-label {
  font-size: 11px;
  line-height: 1.3;
  color: rgba(245, 240, 230, .82);
  transition: color .15s ease;
}

.mega-menu-item:hover .mega-menu-label {
  color: #e8d5a8;
}

.mega-menu-footer {
  flex-basis: 100%;
  display: flex;
  justify-content: flex-end;
  padding-top: .75rem;
  border-top: 1px solid rgba(255, 255, 255, .08);
}

.mega-menu-viewall {
  display: inline-flex;
  align-items: center;
  gap: .35rem;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .1em;
  color: #dda04d;
  text-decoration: none;
}

.mega-menu-viewall svg {
  width: 14px;
  height: 14px;
}

.mega-menu-viewall:hover {
  color: #e8d5a8;
}

.mega-menu-skeleton {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: .5rem;
}

.mega-menu-skeleton-thumb {
  width: 64px;
  height: 64px;
  border-radius: .65rem;
  background: rgba(255, 255, 255, .06);
  animation: mega-menu-pulse 1.4s ease-in-out infinite;
}

.mega-menu-skeleton-line {
  width: 70%;
  height: 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, .06);
  animation: mega-menu-pulse 1.4s ease-in-out infinite;
}

@keyframes mega-menu-pulse {
  0%, 100% { opacity: .5; }
  50% { opacity: 1; }
}
</style>
