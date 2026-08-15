<script setup lang="ts">
import { FALLBACK_PRODUCT_IMAGE } from '~/utils/storefront'
import type { MegaMenuSection } from './AppHeaderMegaMenu.vue'

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

const sections = computed<MegaMenuSection[]>(() => {
  const buckets = new Map<string, MegaMenuSection['items']>()

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
  <AppHeaderMegaMenu
    :sections="sections"
    view-all-path="/san-pham-list"
    :view-all-label="t('products.viewAllProducts')"
    min-width="min(720px, 90vw)"
    max-width="920px"
  />
</template>
