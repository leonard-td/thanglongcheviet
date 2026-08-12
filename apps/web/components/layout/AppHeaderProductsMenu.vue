<script setup lang="ts">
import type { ProductGroup } from '~/composables/useProducts'
import { FALLBACK_PRODUCT_IMAGE, resolveCardImage } from '~/utils/storefront'

const props = defineProps<{
  categories: ProductGroup[]
  collections: ProductGroup[]
  pending: boolean
}>()

const { t, locale } = useI18n()
const localePath = useLocalePath()

// Feature banner: same admin-managed "Cards" content used for the homepage
// pillars (see content.cards in initial-data.json / Medusa admin > Cards) —
// whichever type="link" card points at /san-pham-list drives the image and
// title here, so updating the banner later is just an admin edit, no code
// change.
const { cards, pending: cardsPending } = useCards()

const showSkeleton = computed(() => props.pending || cardsPending.value)

const featuredCard = computed(() =>
  cards.value.find(c => c.type === 'link' && c.is_active && c.path === '/san-pham-list') ?? null,
)
const featuredTitle = computed(() =>
  featuredCard.value?.title?.[locale.value] ?? featuredCard.value?.title?.vi ?? '',
)

// Categories/collections without their own metadata.thumbnail fall back to
// the "Văn hóa Việt" card's image (same Cards content as above) instead of a
// generic stock photo — editing that card's image in Admin > Cards updates
// this fallback too, no code change needed. FALLBACK_PRODUCT_IMAGE is only
// the very last resort if that card itself gets deleted/deactivated.
const categoryFallbackImage = computed(() => {
  const card = cards.value.find(c => c.type === 'link' && c.is_active && c.path === '/van-hoa-viet')
  return (card ? resolveCardImage(card.image) : '') || FALLBACK_PRODUCT_IMAGE
})

const cardImageForPath = (path: string) => {
  const card = cards.value.find(c => c.type === 'link' && c.is_active && c.path === path)
  return (card ? resolveCardImage(card.image) : '') || categoryFallbackImage.value
}

interface GroupItem {
  key: string
  path: string
  label: string
  image: string
}

interface ProductMegaGroup {
  key: string
  title: string
  items: GroupItem[]
}

// Category-style grouping (thegioididong.com pattern): a short group title
// ("Chè", "Cà phê", "Quà tặng") with an image-tile grid underneath, instead
// of one flat "Danh mục" list. Every group is now backed by a real Medusa
// product category (see apps/backend/src/scripts/sync-menu-categories.ts) —
// "Cà phê" and "Quà tặng" still route to their own curated landing pages
// (/an-quang-caffe, /qua-tang-doanh-nghiep) instead of the generic category
// grid, but their tile only renders once the matching category actually
// exists in the backend, and disappears if an admin deactivates/removes it.
//
// Which group a category belongs to is read from its metadata.menu_group
// ("coffee" | "gift", set by sync-menu-categories.ts or by hand via the
// category's Metadata editor in Medusa admin) — NOT from its handle, because
// an admin renaming/recreating the category in the dashboard (as happened
// with "cà phê", created there with handle "ca-phe" instead of a guessed
// "an-quang-caffe") silently dropped it back into "Chè" before. The handle
// list below is only a one-time fallback for categories that predate the
// menu_group tag; keep it in sync with the real handles if it's ever used.
const COFFEE_CATEGORY_HANDLES = ['ca-phe', 'an-quang-caffe']
const GIFT_CATEGORY_HANDLES = ['qua-tang-doanh-nghiep']

type MenuGroupKey = 'tea' | 'coffee' | 'gift'

const categoryMenuGroup = (cat: ProductGroup): MenuGroupKey => {
  if (cat.menuGroup === 'coffee' || cat.menuGroup === 'gift') return cat.menuGroup
  if (COFFEE_CATEGORY_HANDLES.includes(cat.slug)) return 'coffee'
  if (GIFT_CATEGORY_HANDLES.includes(cat.slug)) return 'gift'
  return 'tea'
}

const teaCategories = computed(() => props.categories.filter(cat => categoryMenuGroup(cat) === 'tea'))
const coffeeCategory = computed(() => props.categories.find(cat => categoryMenuGroup(cat) === 'coffee') ?? null)
const giftCategory = computed(() => props.categories.find(cat => categoryMenuGroup(cat) === 'gift') ?? null)

const productGroups = computed<ProductMegaGroup[]>(() => [
  {
    key: 'tea',
    title: t('nav.productsMenu.teaGroup'),
    items: teaCategories.value.map(cat => ({
      key: cat.id,
      path: `/san-pham/danh-muc/${cat.slug}`,
      label: cat.label,
      image: cat.thumbnail || FALLBACK_PRODUCT_IMAGE,
    })),
  },
  {
    key: 'coffee',
    title: t('nav.productsMenu.coffeeGroup'),
    items: coffeeCategory.value
      ? [
          {
            key: coffeeCategory.value.id,
            path: '/an-quang-caffe',
            label: t('nav.productsMenu.anQuangCaffe'),
            image: cardImageForPath('/an-quang-caffe'),
          },
        ]
      : [],
  },
  {
    key: 'gift',
    title: t('nav.productsMenu.giftGroup'),
    items: giftCategory.value
      ? [
          {
            key: giftCategory.value.id,
            path: '/qua-tang-doanh-nghiep',
            label: t('nav.productsMenu.corporateGifts'),
            image: cardImageForPath('/qua-tang-doanh-nghiep'),
          },
        ]
      : [],
  },
].filter(group => group.items.length))
</script>

<template>
  <div class="products-mega">
    <!-- Loading skeleton -->
    <div v-if="showSkeleton" class="products-mega-section">
      <div class="products-mega-grid">
        <div v-for="n in 8" :key="n" class="products-mega-skeleton">
          <div class="products-mega-skeleton-thumb" />
          <div class="products-mega-skeleton-line" />
        </div>
      </div>
    </div>

    <template v-else>

      <div v-for="group in productGroups" :key="group.key" class="products-mega-section">
        <span class="products-mega-title">{{ group.title }}</span>
        <div class="products-mega-grid">
          <NuxtLink
            v-for="item in group.items"
            :key="item.key"
            :to="localePath(item.path)"
            class="products-mega-item"
          >
            <span class="products-mega-thumb">
              <img :src="item.image" :alt="item.label" loading="lazy">
            </span>
            <span class="products-mega-label">{{ item.label }}</span>
          </NuxtLink>
        </div>
      </div>

      <div v-if="collections.length" class="products-mega-section">
        <span class="products-mega-title">{{ t('products.browseCollections') }}</span>
        <div class="products-mega-grid">
          <NuxtLink
            v-for="col in collections"
            :key="col.id"
            :to="localePath(`/san-pham/bo-suu-tap/${col.slug}`)"
            class="products-mega-item"
          >
            <span class="products-mega-thumb">
              <img :src="col.thumbnail || FALLBACK_PRODUCT_IMAGE" :alt="col.label" loading="lazy">
            </span>
            <span class="products-mega-label">{{ col.label }}</span>
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
    </template>
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

.products-mega-skeleton {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: .5rem;
}

.products-mega-skeleton-thumb {
  width: 64px;
  height: 64px;
  border-radius: .65rem;
  background: rgba(255, 255, 255, .06);
  animation: products-mega-pulse 1.4s ease-in-out infinite;
}

.products-mega-skeleton-line {
  width: 70%;
  height: 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, .06);
  animation: products-mega-pulse 1.4s ease-in-out infinite;
}

@keyframes products-mega-pulse {
  0%, 100% { opacity: .5; }
  50% { opacity: 1; }
}
</style>
