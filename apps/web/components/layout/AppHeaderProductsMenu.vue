<script setup lang="ts">
import type { ProductGroup } from '~/composables/useProducts'
import { FALLBACK_PRODUCT_IMAGE } from '~/utils/storefront'

defineProps<{
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
const { cards } = useCards()

const imgModules = import.meta.glob('~/assets/images/*.jpg', {
  eager: true,
  import: 'default',
}) as Record<string, string>
const imgUrl = (name: string) =>
  Object.entries(imgModules).find(([k]) => k.endsWith(`/${name}`))?.[1] ?? ''

const resolveCardImage = (image: string | null) => {
  if (!image) return ''
  if (/^https?:\/\//.test(image) || image.startsWith('/')) return image
  return imgUrl(image)
}

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
</script>

<template>
  <div class="products-mega">
    <!-- Loading skeleton -->
    <div v-if="pending" class="products-mega-grid">
      <div v-for="n in 8" :key="n" class="products-mega-skeleton">
        <div class="products-mega-skeleton-thumb" />
        <div class="products-mega-skeleton-line" />
      </div>
    </div>

    <template v-else>

      <div v-if="categories.length" class="products-mega-section">
        <span class="products-mega-title">{{ t('products.browseCategories') }}</span>
        <div class="products-mega-grid">
          <NuxtLink
            v-for="cat in categories"
            :key="cat.id"
            :to="localePath(`/san-pham/danh-muc/${cat.slug}`)"
            class="products-mega-item"
          >
            <span class="products-mega-thumb">
              <img :src="cat.thumbnail || FALLBACK_PRODUCT_IMAGE" :alt="cat.label" loading="lazy">
            </span>
            <span class="products-mega-label">{{ cat.label }}</span>
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

      <div class="products-mega-section products-mega-links">
        <span class="products-mega-title">{{ t('nav.productsMenu.moreTitle') }}</span>
        <NuxtLink :to="localePath('/an-quang-caffe')" class="products-mega-textlink">
          {{ t('nav.productsMenu.anQuangCaffe') }}
        </NuxtLink>
        <NuxtLink :to="localePath('/qua-tang-doanh-nghiep')" class="products-mega-textlink">
          {{ t('nav.productsMenu.corporateGifts') }}
        </NuxtLink>
        <NuxtLink :to="localePath('/san-pham-list')" class="products-mega-textlink products-mega-textlink-cta">
          {{ t('products.viewAllProducts') }}
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

.products-mega-links {
  flex: 1 1 180px;
  display: flex;
  flex-direction: column;
}

.products-mega-textlink {
  padding: .55rem 0;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: .1em;
  color: rgba(245, 240, 230, .82);
  text-decoration: none;
  border-bottom: 1px solid rgba(255, 255, 255, .06);
  transition: color .15s ease;
}

.products-mega-textlink:hover {
  color: #e8d5a8;
}

.products-mega-textlink-cta {
  margin-top: .75rem;
  border: none;
  color: #dda04d;
  font-weight: 700;
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
