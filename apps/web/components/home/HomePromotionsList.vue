<script setup lang="ts">
const props = withDefaults(defineProps<{
  /** Thời lượng một vòng cuộn. Trang chủ v3 dùng 42s cho dễ đọc. */
  duration?: string
}>(), {
  duration: '25s',
})

const { t, locale } = useI18n()
const localePath = useLocalePath()
const { featuredProducts, pending } = useProducts()

const promotions = computed(() =>
  featuredProducts.value.map(p => ({
    id: p.id,
    slug: p.slug,
    name: p.title,
    price: p.price,
    image: p.image,
    shortDesc: p.shortDesc,
    variantId: p.variantId,
    inStock: p.inStock,
  })),
)

const formatPrice = (price: number) =>
  new Intl.NumberFormat('vi-VN').format(price) + (locale.value === 'en' ? ' VND' : 'đ')
</script>

<template>
  <div class="promotions-card" role="group" :aria-label="t('home.pillars.promotions')">
    <div class="promo-viewport">
      <div v-if="!promotions.length" class="promo-empty">
        {{ pending ? t('common.loading') : t('home.noFeaturedProducts') }}
      </div>
      <div v-else class="promo-track" :style="{ '--promo-duration': props.duration }">
        <!-- inert trên bản nhân đôi để nút thêm giỏ/mua ngay không nhận tab/click trùng -->
        <div v-for="n in 2" :key="n" class="promo-set" :aria-hidden="n === 2 ? 'true' : undefined" :inert="n === 2">
          <NuxtLink
            v-for="item in promotions"
            :key="`${n}-${item.id}`"
            :to="localePath(`/san-pham/${item.slug}`)"
            class="promo-item"
          >
            <div class="promo-image">
              <img :src="item.image" :alt="item.name" />
            </div>
            <div class="promo-info">
              <h4 class="promo-name">{{ item.name }}</h4>
              <p v-if="item.shortDesc" class="promo-desc">{{ item.shortDesc }}</p>
              <div class="promo-prices">
                <span class="promo-price-new">{{ formatPrice(item.price) }}</span>
                <ProductCardActions
                  :variant-id="item.variantId"
                  :slug="item.slug"
                  :in-stock="item.inStock"
                  icon-only
                  class="ml-auto"
                />
              </div>
            </div>
          </NuxtLink>
        </div>
      </div>
    </div>

    <div class="promo-header">
      <span class="promo-icon" aria-hidden="true">🎁</span>
      <span class="promo-title">{{ t('home.pillars.promotions') }}</span>
    </div>
  </div>
</template>

<style scoped>
.promotions-card {
  position: relative;
  display: block;
  /* width: calc(100% - var(--pillar-gutter, 0px) * 2); */
  margin-left: auto;
  margin-right: auto;
  max-width: none;
  aspect-ratio: 346 / 197;
  overflow: hidden;
  border-radius: 6px;
  background:
    radial-gradient(120% 90% at 82% 0%, rgba(196, 30, 58, .18), transparent 60%),
    linear-gradient(160deg, #1f1512 0%, #120e0c 100%);
  box-shadow: 1px 1px 6px 1px #666666;
}

@media (min-width: 1024px) {
  .promotions-card {
    max-width: 346px;
  }
}

.promo-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  background: linear-gradient(
    to bottom,
    rgba(196, 30, 58, .88) 0%,
    rgba(161, 12, 37, .72) 65%,
    rgba(161, 12, 37, 0) 100%
  );
  border-bottom: 1px solid rgba(255, 255, 255, .1);
}

.promo-icon {
  font-size: 16px;
  line-height: 1;
}

.promo-title {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: .06em;
  text-transform: uppercase;
  color: #fff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, .5);
}

.promo-viewport {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: 6px;
  padding-top: 48px;
  -webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 52px, #000 calc(100% - 16px), transparent 100%);
          mask-image: linear-gradient(to bottom, transparent 0, #000 52px, #000 calc(100% - 16px), transparent 100%);
}

.promo-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: rgba(255, 255, 255, .5);
  font-size: 12px;
}

.promo-track {
  display: flex;
  flex-direction: column;
  animation: promo-scroll var(--promo-duration, 25s) linear infinite;
  will-change: transform;
}

.promotions-card:hover .promo-track {
  animation-play-state: paused;
}

@keyframes promo-scroll {
  from { transform: translateY(0); }
  to   { transform: translateY(-50%); }
}

.promo-set {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px 12px 0;
}

.promo-item {
  position: relative;
  display: flex;
  gap: 10px;
  padding: 8px;
  background: rgba(255, 255, 255, .03);
  border: 1px solid rgba(255, 255, 255, .06);
  border-radius: 8px;
  transition: background .3s ease, border-color .3s ease;
  text-decoration: none;
}

.promo-item:hover {
  background: rgba(255, 255, 255, .06);
  border-color: rgba(196, 30, 58, .4);
}

.promo-image {
  position: relative;
  flex-shrink: 0;
  width: 60px;
  height: 60px;
  border-radius: 6px;
  overflow: hidden;
  background: #1a1a1a;
}

.promo-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.promo-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-width: 0;
}

.promo-name {
  margin: 0;
  font-size: 11.5px;
  font-weight: 600;
  line-height: 1.3;
  color: #fff;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.promo-desc {
  margin: 3px 0 0;
  font-size: 10.5px;
  line-height: 1.35;
  color: rgba(255, 255, 255, .55);
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.promo-prices {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.promo-price-new {
  font-size: 13px;
  font-weight: 700;
  color: #c41e3a;
  font-variant-numeric: tabular-nums;
}

@media (prefers-reduced-motion: reduce) {
  .promo-track {
    animation: none;
  }

  .promo-viewport {
    overflow-y: auto;
  }
}
</style>
