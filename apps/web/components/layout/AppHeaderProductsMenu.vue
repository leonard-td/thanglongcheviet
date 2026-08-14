<script setup lang="ts">
import { FALLBACK_PRODUCT_IMAGE } from '~/utils/storefront'

type NavLinkType =
  | 'product'
  | 'product_category'
  | 'product_collection'
  | 'product_topic'
  | 'post'
  | 'post_topic'
  | 'event'
  | 'event_topic'

interface NavChildLink {
  key: string
  path: string
  label?: string
  openInNewTab?: boolean
  thumbnail?: string | null
  linkType?: NavLinkType | null
}

const props = defineProps<{
  children: NavChildLink[]
}>()

const { t } = useI18n()
const localePath = useLocalePath()

interface GroupItem {
  key: string
  path: string
  label: string
  image: string
  openInNewTab?: boolean
}

interface ProductMegaGroup {
  key: string
  title: string
  items: GroupItem[]
}

// Every tile in this menu comes straight from the "Sản phẩm" nav item's
// children in Admin > Điều hướng — no independent product/category scan.
// Section grouping falls out of `linkType`, already resolved server-side by
// nav-link-resolver.ts from each item's url (see apps/backend CLAUDE.md's
// "Navigation item thumbnails") — admin doesn't pick a section manually,
// it's inferred from what kind of entity the item actually links to.
const SECTIONS: { linkTypes: NavLinkType[] | null; titleKey: string }[] = [
  { linkTypes: ['product_category'], titleKey: 'products.browseCategories' },
  { linkTypes: ['product_collection'], titleKey: 'products.browseCollections' },
  { linkTypes: null, titleKey: 'nav.productsMenu.moreTitle' }, // catch-all: single products, topics, curated/static pages
]

const groups = computed<ProductMegaGroup[]>(() => {
  const buckets = new Map<string, GroupItem[]>()

  for (const child of props.children) {
    const section = SECTIONS.find(
      s => s.linkTypes === null || (child.linkType && s.linkTypes.includes(child.linkType)),
    )!
    const items = buckets.get(section.titleKey) ?? []
    items.push({
      key: child.key,
      path: child.path,
      label: child.label || t(child.key),
      image: child.thumbnail || FALLBACK_PRODUCT_IMAGE,
      openInNewTab: child.openInNewTab,
    })
    buckets.set(section.titleKey, items)
  }

  return SECTIONS
    .filter(s => buckets.has(s.titleKey))
    .map(s => ({ key: s.titleKey, title: t(s.titleKey), items: buckets.get(s.titleKey)! }))
})
</script>

<template>
  <div class="products-mega">
    <div v-for="group in groups" :key="group.key" class="products-mega-section">
      <span class="products-mega-title">{{ group.title }}</span>
      <div class="products-mega-grid">
        <NuxtLink
          v-for="item in group.items"
          :key="item.key"
          :to="localePath(item.path)"
          class="products-mega-item"
          :target="item.openInNewTab ? '_blank' : undefined"
          :rel="item.openInNewTab ? 'noopener noreferrer' : undefined"
        >
          <span class="products-mega-thumb">
            <img :src="item.image" :alt="item.label" loading="lazy">
          </span>
          <span class="products-mega-label">{{ item.label }}</span>
        </NuxtLink>
      </div>
    </div>

    <div class="products-mega-footer">
      <NuxtLink :to="localePath('/san-pham-list')" class="products-mega-viewall">
        {{ t('products.viewAllProducts') }}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="m9 6 6 6-6 6" />
        </svg>
      </NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.products-mega {
  display: flex;
  flex-wrap: wrap;
  gap: 1.75rem 2.5rem;
  min-width: min(720px, 90vw);
  max-width: 920px;
  padding: 1.5rem 1.75rem;
}

.products-mega-section {
  flex: 1 1 220px;
}

.products-mega-feature {
  position: relative;
  flex: 0 0 168px;
  min-height: 220px;
  border-radius: .75rem;
  overflow: hidden;
  display: block;
  background: #24331f;
}

.products-mega-feature img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  position: absolute;
  inset: 0;
  transition: transform .4s ease;
}

.products-mega-feature:hover img {
  transform: scale(1.06);
}

.products-mega-feature-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
  padding: 1rem;
  background: linear-gradient(to top, rgba(0, 0, 0, .85), rgba(0, 0, 0, 0) 65%);
}

.products-mega-feature-title {
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.35;
  color: #f5f0e6;
}

.products-mega-title {
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

.products-mega-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(78px, 1fr));
  gap: 1rem .75rem;
}

.products-mega-item {
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

.products-mega-item:hover {
  background: rgba(201, 168, 108, .08);
}

.products-mega-thumb {
  display: block;
  width: 64px;
  height: 64px;
  border-radius: .65rem;
  overflow: hidden;
  background: #24331f;
  ring: 1px solid rgba(255, 255, 255, .08);
  border: 1px solid rgba(255, 255, 255, .08);
  transition: border-color .15s ease;
}

.products-mega-item:hover .products-mega-thumb {
  border-color: rgba(201, 168, 108, .55);
}

.products-mega-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.products-mega-label {
  font-size: 11px;
  line-height: 1.3;
  color: rgba(245, 240, 230, .82);
  transition: color .15s ease;
}

.products-mega-item:hover .products-mega-label {
  color: #e8d5a8;
}

.products-mega-footer {
  flex-basis: 100%;
  display: flex;
  justify-content: flex-end;
  padding-top: .75rem;
  border-top: 1px solid rgba(255, 255, 255, .08);
}

.products-mega-viewall {
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

.products-mega-viewall svg {
  width: 14px;
  height: 14px;
}

.products-mega-viewall:hover {
  color: #e8d5a8;
}
</style>
