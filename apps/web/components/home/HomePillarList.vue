<script setup lang="ts">
import type { CardItem } from '~/composables/useCards'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const { hours, contact } = useSettings()
const { cards } = useCards()

const imgModules = import.meta.glob('~/assets/images/*.jpg', {
  eager: true,
  import: 'default',
}) as Record<string, string>
const imgUrl = (name: string) =>
  Object.entries(imgModules).find(([k]) => k.endsWith(`/${name}`))?.[1] ?? ''

// Card ảnh có thể là tên file trong assets/images (card mặc định/seed) hoặc
// một URL tuyệt đối (admin dán link ảnh ngoài) — thử URL trước, rồi mới
// glob-lookup theo tên file.
const resolveCardImage = (image: string | null) => {
  if (!image) return ''
  if (/^https?:\/\//.test(image)) return image
  return imgUrl(image)
}

const cardTitle = (card: CardItem) =>
  card.title?.[locale.value] ?? card.title?.vi ?? ''

// Pillar "Giờ mở cửa + Liên hệ & Đặt lịch": các dòng liên hệ tự cuộn dưới->trên.
const contactRows = computed(() => {
  const address = (contact.value.address as Record<string, string>)
  return [
    { key: 'address', label: t('contact.address'), value: address[locale.value] ?? address.vi, href: '' },
    { key: 'phone', label: t('contact.phone'), value: contact.value.phoneDisplay, href: `tel:${contact.value.phone.replace(/\s+/g, '')}` },
    { key: 'email', label: t('contact.email'), value: contact.value.email, href: `mailto:${contact.value.email}` },
  ]
})

// Bản đồ tới địa chỉ công ty: nhúng Google Maps + nút chỉ đường mở app/maps.
const mapEmbed = computed(() => contact.value.mapEmbed)
const directionsUrl = computed(() => {
  const address = contact.value.address as Record<string, string>
  const q = encodeURIComponent(address[locale.value] ?? address.vi ?? '')
  return `https://www.google.com/maps/search/?api=1&query=${q}`
})
</script>

<template>
  <div class="home-pillars">
    <div class="row">
      <template v-for="(card, i) in cards" :key="card.id">
        <div class="col-md-6 mb30 col-sm-12 col-sm-offset-0">
          <!-- Card liên kết thường — quản lý trong Admin > Cards -->
          <NuxtLink v-if="card.type === 'link'" :to="localePath(card.path || '/')" class="preview-link">
            <span class="preview-media">
              <img :src="resolveCardImage(card.image)" class="img-responsive" :alt="cardTitle(card)">
            </span>
            <span class="pillar-title">{{ cardTitle(card) }}</span>
          </NuxtLink>

          <!-- Card ưu đãi trong tháng (cố định): danh sách sản phẩm scroll từ dưới lên -->
          <HomePromotionsList v-else-if="card.type === 'promotions'" />

          <!-- Card thông tin (cố định): Giờ mở cửa + Liên hệ & Đặt lịch, tự cuộn dưới -> trên -->
          <div v-else-if="card.type === 'contact'" class="info-card" role="group" :aria-label="`${t('contact.hours')} · ${t('contact.title')}`">
            <div class="info-viewport">
              <!-- Hai bản giống nhau xếp chồng để vòng lặp liền mạch (CSS-only) -->
              <div class="info-track">
                <div v-for="n in 2" :key="n" class="info-set" :aria-hidden="n === 2 ? 'true' : undefined">
                  <section class="info-block">
                    <h3 class="info-heading"><span class="info-ic" aria-hidden="true">🕒</span>{{ t('contact.hours') }}</h3>
                    <ul class="info-rows">
                      <li v-for="h in hours" :key="h.days" class="info-row">
                        <span class="info-day">{{ h.days }}</span>
                        <span class="info-time">{{ h.time }}</span>
                      </li>
                    </ul>
                  </section>

                  <section class="info-block">
                    <h3 class="info-heading"><span class="info-ic" aria-hidden="true">📞</span>{{ t('contact.title') }}</h3>
                    <ul class="info-rows">
                      <li v-for="r in contactRows" :key="r.key" class="info-row info-row--stack">
                        <span class="info-label">{{ r.label }}</span>
                        <component :is="r.href ? 'a' : 'span'" :href="r.href || undefined" class="info-val">{{ r.value }}</component>
                      </li>
                    </ul>
                  </section>
                </div>
              </div>
            </div>
          </div>

          <!-- Card bản đồ (cố định): vị trí công ty trên Google Maps + nút chỉ đường -->
          <div v-else-if="card.type === 'map'" class="map-card">
            <iframe
              v-if="mapEmbed"
              :src="mapEmbed"
              class="map-frame"
              :title="t('contact.map')"
              loading="lazy"
              referrerpolicy="no-referrer-when-downgrade"
              allowfullscreen
            />
            <a
              :href="directionsUrl"
              target="_blank"
              rel="noopener"
              class="map-overlay"
            >
              <span class="map-title"><span class="map-ic" aria-hidden="true">📍</span>{{ t('contact.map') }}</span>
              <span class="map-cta">{{ t('contact.directions') }} ›</span>
            </a>
          </div>
        </div>
        <div v-if="i % 2 === 1" class="clearfix" />
      </template>
    </div>
  </div>
</template>

<style scoped>
.home-pillars {
  --pillar-red: #a10c25;
  --pillar-red-bright: #c41e3a;
  --pillar-red-glow: rgba(161, 12, 37, .72);
  --pillar-green: #4d7c3a;
  --pillar-green-glow: rgba(77, 124, 58, .55);
  margin-top: 4px;
}

@media (max-width: 1023px) {
  .home-pillars {
    --pillar-gutter: 24px;
    padding-left: var(--pillar-gutter);
    padding-right: var(--pillar-gutter);
  }

  .home-pillars :deep(.mb30) {
    width: 100%;
    float: none;
    padding-left: 0;
    padding-right: 0;
  }
}

@media (min-width: 640px) and (max-width: 1023px) {
  .home-pillars {
    --pillar-gutter: 24px;
  }
}

/* ── Pillar thông tin (Giờ mở cửa + Liên hệ & Đặt lịch) ── */
/* Khớp hình học với .preview-link để xếp cùng lưới pillar */
.info-card {
  position: relative;
  display: block;
  width: calc(100% - var(--pillar-gutter, 0px) * 2);
  margin-left: auto;
  margin-right: auto;
  max-width: none;
  aspect-ratio: 346 / 197;
  overflow: hidden;
  border-radius: 6px;
  background:
    radial-gradient(120% 90% at 18% 0%, rgba(77, 124, 58, .22), transparent 60%),
    linear-gradient(160deg, #20281c 0%, #161d12 100%);
  box-shadow: 1px 1px 6px 1px #666666;
}

@media (min-width: 1024px) {
  .info-card {
    max-width: 346px;
  }
}

/* ── Pillar bản đồ (Google Maps) ── khớp hình học với .preview-link ── */
.map-card {
  position: relative;
  display: block;
  width: calc(100% - var(--pillar-gutter, 0px) * 2);
  margin-left: auto;
  margin-right: auto;
  max-width: none;
  aspect-ratio: 346 / 197;
  overflow: hidden;
  border-radius: 6px;
  background: #20281c;
  box-shadow: 1px 1px 6px 1px #666666;
}

@media (min-width: 1024px) {
  .map-card {
    max-width: 346px;
  }
}

.map-frame {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
  filter: grayscale(.2) contrast(1.05);
}

/* Lớp phủ tiêu đề + nút chỉ đường, không che thao tác bản đồ ở giữa */
.map-overlay {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 4;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 18px 12px 10px;
  text-decoration: none;
  background: linear-gradient(
    to top,
    rgba(12, 20, 14, .92) 0%,
    rgba(12, 20, 14, .58) 55%,
    rgba(12, 20, 14, 0) 100%
  );
  transition: background .35s ease;
}

.map-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: .04em;
  color: #fff;
}

.map-ic {
  font-size: 13px;
  line-height: 1;
}

.map-cta {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .05em;
  text-transform: uppercase;
  color: #e7d8b4;
  white-space: nowrap;
}

.map-overlay:hover {
  background: linear-gradient(
    to top,
    rgba(161, 12, 37, .92) 0%,
    rgba(30, 168, 53, .55) 55%,
    rgba(1, 97, 14, 0) 100%
  );
}

.map-overlay:hover .map-cta {
  color: #fff;
}

.info-viewport {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: 6px;
  /* Làm mờ mép trên/dưới để dòng chữ trôi vào/ra êm */
  -webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 13%, #000 87%, transparent 100%);
          mask-image: linear-gradient(to bottom, transparent 0, #000 13%, #000 87%, transparent 100%);
}

/* Track = 2 bản .info-set xếp chồng; dịch -50% là tròn đúng 1 bản -> lặp liền mạch */
.info-track {
  display: flex;
  flex-direction: column;
  animation: info-scroll 22s linear infinite;
  will-change: transform;
}

.info-card:hover .info-track,
.info-card:focus-within .info-track {
  animation-play-state: paused;
}

@keyframes info-scroll {
  from { transform: translateY(0); }
  to   { transform: translateY(-50%); }
}

/* Mỗi bản tự chứa khoảng cách dẫn (padding-top + gap) đồng đều -> điểm nối phẳng */
.info-set {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px 18px 0;
}

.info-heading {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: .06em;
  text-transform: uppercase;
  color: #e7d8b4;
}

.info-ic {
  font-size: 14px;
  line-height: 1;
}

.info-rows {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.info-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  font-size: 12.5px;
  line-height: 1.4;
  color: rgba(255, 255, 255, .9);
}

.info-row--stack {
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
}

.info-day {
  color: rgba(255, 255, 255, .72);
}

.info-time {
  flex-shrink: 0;
  font-weight: 600;
  color: #fff;
  font-variant-numeric: tabular-nums;
}

.info-label {
  font-size: 10.5px;
  letter-spacing: .05em;
  text-transform: uppercase;
  color: rgba(231, 216, 180, .68);
}

.info-val {
  color: #fff;
  text-decoration: none;
  word-break: break-word;
}

a.info-val:hover {
  color: var(--pillar-red-bright);
  text-decoration: underline;
}

@media (prefers-reduced-motion: reduce) {
  .info-track {
    animation: none;
  }

  /* Không có chuyển động: cho phép cuộn tay để xem đủ nội dung */
  .info-viewport {
    overflow-y: auto;
  }
}

.pillar-title {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 4;
  display: block;
  margin: 0;
  padding: 22px 12px 10px;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: .08em;
  line-height: 1.35;
  text-align: center;
  text-transform: capitalize;
  color: #fff;
  background: linear-gradient(
    to top,
    rgba(12, 20, 14, .92) 0%,
    rgba(12, 20, 14, .58) 42%,
    rgba(12, 20, 14, 0) 100%
  );
  border: none;
  border-radius: 0 0 6px 6px;
  box-sizing: border-box;
  pointer-events: none;
  transition: background .45s ease;
}

@media (min-width: 768px) {
  .pillar-title {
    padding: 24px 14px 11px;
    font-size: 12px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pillar-title {
    background: linear-gradient(
      to top,
      rgba(12, 20, 14, .95) 0%,
      rgba(12, 20, 14, .72) 55%,
      rgba(12, 20, 14, .2) 100%
    );
  }
}

.preview-link {
  position: relative;
  display: block;
  width: calc(100% - var(--pillar-gutter) * 2);
  margin-left: auto;
  margin-right: auto;
  max-width: none;
  aspect-ratio: 346 / 197;
  overflow: hidden;
  border-radius: 6px;
  background: #2a3326;
  border: 2px solid transparent;
  box-shadow: none;
  transform: translateZ(0);
  transition: border-color .35s cubic-bezier(.22, .61, .36, 1);
  text-decoration: none;
}

.preview-link:not(:hover) {
  overflow: hidden;
}

@media (min-width: 1024px) {
  .preview-link {
    max-width: 346px;
    margin-left: auto;
    margin-right: auto;
  }
}

.preview-media {
  position: absolute;
  inset: 0;
  z-index: 1;
  overflow: hidden;
  border-radius: 6px;
}

.preview-link img.img-responsive {
  width: 100%;
  height: 100%;
  max-width: 100%;
  padding: 0;
  object-fit: cover;
  display: block;
  opacity: 1;
  background: transparent;
  border-radius: 0;
  box-shadow: none;
  transition: transform .6s cubic-bezier(.22, .61, .36, 1),
              filter .45s ease;
  will-change: transform;
}

/* Ghi đè style.css global (.col-md-6 img:hover { width:90%; padding:5% }) */
.preview-link:hover img.img-responsive {
  width: 100%;
  height: 100%;
  padding: 0;
  opacity: 1;
  background: transparent;
}

.preview-link::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 2;
  background: linear-gradient(
    to bottom,
    rgba(161, 12, 37, .42) 0%,
    rgba(77, 124, 58, .38) 45%,
    rgba(30, 95, 14, .25) 70%,
    transparent 85%
  );
  opacity: 0;
  transition: opacity .45s ease;
  pointer-events: none;
}

.preview-link::before {
  content: none;
}

.preview-link:hover {
  overflow: hidden;
  transform: none;
  border-color: var(--pillar-red);
  box-shadow: none;
}

.preview-link:hover .preview-media img.img-responsive {
  transform: scale(1.06);
  filter: saturate(1.12) brightness(1.06) contrast(1.04);
}

.preview-link:hover::after { opacity: 1; }

.preview-link:focus-visible {
  outline: 2px solid var(--pillar-red-bright);
  outline-offset: 2px;
}

.preview-link:hover .pillar-title {
  background: linear-gradient(
    to top,
    rgba(161, 12, 37, .94) 0%,
    rgba(30, 168, 53, 0.62) 46%,
    rgba(1, 97, 14, 0) 100%
  );
}

@supports not (aspect-ratio: 1) {
  .preview-link {
    max-height: none;
  }

  @media (min-width: 1024px) {
    .preview-link {
      max-height: 197px;
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .preview-link,
  .preview-link .preview-media img.img-responsive,
  .preview-link::after {
    transition-duration: .01ms;
  }

  .preview-link:hover {
    transform: none;
    box-shadow: none;
    border-color: var(--pillar-red);
  }

  .preview-link:hover .preview-media img.img-responsive { transform: none; }
}
</style>
