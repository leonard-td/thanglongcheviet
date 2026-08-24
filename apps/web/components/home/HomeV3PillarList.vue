<script setup lang="ts">
import type { CardItem } from '~/composables/useCards'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const { hours, contact } = useSettings()
const { cards } = useCards()
const { posts } = useBlog()
const { homeVideoId } = useSiteSettings()

const imgModules = import.meta.glob('~/assets/images/*.jpg', {
  eager: true,
  import: 'default',
}) as Record<string, string>
const imgUrl = (name: string) =>
  Object.entries(imgModules).find(([k]) => k.endsWith(`/${name}`))?.[1] ?? ''

// Card ảnh có thể là một URL tuyệt đối hoặc đường dẫn gốc /... (admin dán
// link ảnh ngoài, hoặc card seed trỏ vào apps/web/public) — dùng thẳng — hoặc
// tên file trần trong assets/images (card seed cũ), cần glob-lookup.
const resolveCardImage = (image: string | null) => {
  if (!image) return ''
  if (/^https?:\/\//.test(image) || image.startsWith('/')) return image
  return imgUrl(image)
}

const cardTitle = (card: CardItem) =>
  card.title?.[locale.value] ?? card.title?.vi ?? ''

// Pillar "Giờ mở cửa + Liên hệ & Đặt lịch": v3 hiển thị tĩnh, khách tự cuộn
// trong khung nếu nội dung dài hơn 346×197 (khung card giữ nguyên theo v1).
const contactRows = computed(() =>
  [
    { key: 'address', label: t('contact.address'), value: contact.value.address, href: '' },
    { key: 'phone', label: t('contact.phone'), value: contact.value.phone, href: `tel:${contact.value.phone.replace(/\s+/g, '')}` },
    { key: 'hotline', label: t('contact.hotline'), value: contact.value.hotline, href: `tel:${contact.value.hotline.replace(/\s+/g, '')}` },
    { key: 'email', label: t('contact.email'), value: contact.value.email, href: `mailto:${contact.value.email}` },
  ].filter(row => row.value),
)

// Bản đồ tới địa chỉ công ty: nhúng Google Maps + nút chỉ đường mở app/maps.
const mapEmbed = computed(() => contact.value.mapEmbed)
const directionsUrl = computed(
  () => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contact.value.address)}`,
)

// Video giới thiệu: dùng "facade" (ảnh poster + nút play) thay vì nhúng iframe
// autoplay ngay từ đầu. Vừa bớt một khối chuyển động tự chạy, vừa không kéo
// ~1MB JS của YouTube vào lần render đầu.
// Khối video chỉ hiện khi admin đã cấu hình (Settings → Thông tin cửa hàng).
const reviewVideoId = computed(() => homeVideoId.value || '')
const reviewUrl = computed(() => `https://youtu.be/${reviewVideoId.value}`)
const videoPlaying = ref(true)
// maxresdefault không tồn tại với mọi video -> lùi về hqdefault (luôn có).
const posterFallback = ref(false)
watch(reviewVideoId, () => { posterFallback.value = false })
const videoPoster = computed(
  () => `https://i.ytimg.com/vi/${reviewVideoId.value}/${posterFallback.value ? 'hqdefault' : 'maxresdefault'}.jpg`,
)
const onPosterError = () => {
  posterFallback.value = true
}

const featuredPosts = computed(() => posts.value.slice(0, 5))
</script>

<template>
  <div class="home-pillars">
    <div class="home-pillars-grid">
      <aside class="home-pillars-col home-pillars-col--left">
        <div v-if="reviewVideoId" class="home-side-card home-side-card--media">
          <div class="home-video-preview">
            <div v-if="videoPlaying" class="home-video-preview__media">
              <iframe
                width="100%"
                height="100%"
                :src="`https://www.youtube.com/embed/${reviewVideoId}?autoplay=1&mute=1&loop=1&playlist=${reviewVideoId}&playsinline=1&rel=0`"
                title="YouTube video player"
                frameborder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerpolicy="strict-origin-when-cross-origin"
                allowfullscreen
              />
            </div>

            <button
              v-else
              type="button"
              class="home-video-preview__media home-video-preview__facade"
              :aria-label="t('home.playIntroVideo')"
              @click="videoPlaying = true"
            >
              <img :src="videoPoster" alt="" loading="lazy" @error="onPosterError">
              <span class="home-video-preview__play" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false"><path d="M8 5.5v13l11-6.5z" /></svg>
              </span>
            </button>
          </div>
        </div>

        <div v-if="featuredPosts.length" class="home-side-card home-side-card--news">
          <div class="home-side-card__head">
            <p class="home-side-card__eyebrow">{{ t('home.featuredNews') }}</p>
          </div>
          <div class="home-featured-news" data-lenis-prevent>
            <ul class="home-featured-news__list">
              <li v-for="post in featuredPosts" :key="`news-${post.slug}`" class="home-featured-news__item">
                <NuxtLink :to="localePath(`/tin-tuc/${post.slug}`)" class="home-featured-news__link">
                  <span class="home-featured-news__thumb">
                    <img :src="post.image" :alt="post.title" loading="lazy">
                  </span>
                  <span class="home-featured-news__body">
                    <span class="home-featured-news__cat">{{ post.topic?.name ?? t('blog.eyebrow') }}</span>
                    <span class="home-featured-news__title">{{ post.title }}</span>
                  </span>
                </NuxtLink>
              </li>
            </ul>
          </div>
          <NuxtLink :to="localePath('/tin-tuc')" class="home-featured-news__all">
            {{ t('home.viewAllNews') }} ›
          </NuxtLink>
        </div>
      </aside>

      <div class="home-pillars-col home-pillars-col--center">
        <div class="home-center-widgets">
          <WidgetsLangSwitch inline />
        </div>
        <div class="home-center-dock">
          <WidgetsConnectWidget inline />
        </div>
      </div>

      <div class="home-pillars-col home-pillars-col--right">
        <div class="home-section-squares">
          <template v-for="card in cards" :key="card.id">
            <div class="home-section-item">
              <NuxtLink v-if="card.type === 'link'" :to="localePath(card.path || '/')" class="preview-link">
                <span class="preview-media">
                  <img :src="resolveCardImage(card.image)" class="img-responsive" :alt="cardTitle(card)">
                </span>
                <span class="pillar-title">{{ cardTitle(card) }}</span>
              </NuxtLink>

              <HomePromotionsList v-else-if="card.type === 'promotions'" duration="42s" />

              <div v-else-if="card.type === 'contact'" class="info-card" role="group" :aria-label="`${t('contact.hours')} · ${t('contact.title')}`">
                <div class="info-viewport" data-lenis-prevent tabindex="0">
                  <div class="info-set">
                    <section v-if="hours.length" class="info-block">
                      <h3 class="info-heading"><span class="info-ic" aria-hidden="true">🕒</span>{{ t('contact.hours') }}</h3>
                      <ul class="info-rows">
                        <li v-for="h in hours" :key="h.days" class="info-row">
                          <span class="info-day">{{ h.days }}</span>
                          <span class="info-time">{{ h.time }}</span>
                        </li>
                      </ul>
                    </section>

                    <section v-if="contactRows.length" class="info-block">
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
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-pillars {
  --pillar-red: #a10c25;
  --pillar-red-bright: #c41e3a;
  --pillar-red-glow: rgba(161, 12, 37, .72);
  --pillar-green: #7c4d3a;
  --pillar-green-glow: rgba(124, 68, 58, 0.55);
  margin-top: 4px;
}

.home-pillars-grid {
  --pillar-card-w: 346px;
  --pillar-card-gap: 16px;
  /* Bề rộng cột phải = đúng 2 card + gap = 708px */
  --pillar-right-w: calc(var(--pillar-card-w) * 2 + var(--pillar-card-gap));
  display: grid;
  gap: 24px;
  align-items: start;
  overflow: visible;
}

.home-pillars-col {
  min-width: 0;
  overflow: visible;
}

/* ── Lưới cột ────────────────────────────────────────
   Cột phải dùng track `minmax(0, 708px)` — KHÔNG phải `fr` — nên được cấp chỗ
   trước, phần dư mới chia cho các track `fr`. Nhờ vậy card luôn đạt đúng 346px
   theo thiết kế thay vì bị bóp còn ~269px như v1 (nơi cột phải chỉ được
   `0.30fr` trong khi cột giữa trống chiếm `0.4fr`). */

/* 1024–1439px: bỏ cột giữa, dồn chỗ cho video và card. Giữ 3 cột ở dải này sẽ
   ép cột trái xuống ~306px @1280 — hẹp hơn cả v1 — vì cột phải đã lấy trọn
   708px. Bỏ cột giữa cho cột trái ~516px @1280. */
@media (min-width: 1024px) and (max-width: 1439px) {
  .home-pillars-grid {
    grid-template-columns:
      minmax(300px, 1fr)
      minmax(0, var(--pillar-right-w));
    gap: 20px;
  }
}

/* ≥1440px: đủ chỗ cho 3 cột; cột giữa vừa khoe ảnh nền vừa chứa nút chuyển
   ngôn ngữ và dải icon liên hệ (xem `.home-pillars-col--center`). */
@media (min-width: 1440px) {
  .home-pillars-grid {
    grid-template-columns:
      minmax(0, 1.4fr)                      /* trái: video + tin tức */
      minmax(120px, 0.85fr)                 /* giữa: nút ngôn ngữ + khoảng thở */
      minmax(0, var(--pillar-right-w));     /* phải: 708px */
    gap: 24px;
  }
}

/* ── Cột giữa: nút ngôn ngữ (đỉnh) + widget liên hệ (đáy) ──
   Cột chỉ được cấp chỗ từ 1440px. Hẹp hơn thì dùng `position: absolute` +
   kích thước 0 thay cho `display: none`: cột không chiếm ô nào trong lưới,
   nhưng hai widget bên trong VẪN render và tự quay về vị trí `fixed` ở góc
   (`display: none` sẽ xoá luôn cả cây con, mất nút ngôn ngữ trên mobile). */
.home-pillars-col--center {
  position: absolute;
  width: 0;
  height: 0;
}

@media (min-width: 1440px) {
  .home-pillars-col--center {
    position: static;
    width: auto;
    height: auto;
    /* Cột cao bằng cả hàng để hai widget sticky có đường trượt. `min-height`
       lo trường hợp nội dung ngắn hơn màn hình: cột vẫn kéo tới đáy khung nhìn
       nên dải liên hệ không lửng lơ giữa trang. */
    align-self: stretch;
    min-height: calc(100dvh - var(--site-marquee-h, 0px) - 48px);
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .home-center-widgets {
    position: sticky;
    top: calc(var(--site-marquee-h, 0px) + 24px);
    z-index: 5;
  }

  /* Dải icon liên hệ: ghim đáy khung nhìn bằng `sticky` thay vì `fixed`, để nó
     vừa dính đáy khi cuộn vừa tự canh ngang theo cột giữa — `fixed` sẽ mất
     liên hệ với cột và phải tính toạ độ tay theo tỉ lệ lưới. */
  .home-center-dock {
    position: sticky;
    bottom: 24px;
    margin-top: auto;
    z-index: 5;
  }
}

/* ── Cột trái: chia chiều cao bằng flex ──────────────
   v1 dùng `max-height: 50vh` cho khối tin tức — con số không liên quan tới chỗ
   trống thực còn lại sau video. Ở đây card tin tức lấp đúng phần dư. */
.home-pillars-col--left {
  position: sticky;
  top: calc(var(--site-marquee-h, 0px) + 24px);
  display: flex;
  flex-direction: column;
  gap: 18px;
  max-width: 680px;
  max-height: calc(100dvh - var(--site-marquee-h, 0px) - 48px);
}

.home-side-card {
  padding: 18px;
  border-radius: 16px;
  background: rgba(15, 20, 16, 0.82);
  border: 1px solid rgba(231, 216, 180, 0.18);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.22);
  backdrop-filter: blur(10px);
}

.home-side-card--media {
  flex: 0 0 auto;
  padding: 0;
}

.home-side-card--news {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.home-side-card__head {
  flex: 0 0 auto;
  margin-bottom: 12px;
}

.home-side-card__eyebrow {
  margin: 0 0 4px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #c9a86c;
}

/* ── Video: facade (poster + nút play) thay cho iframe autoplay ── */
.home-video-preview {
  display: block;
}

.home-video-preview__media {
  position: relative;
  display: block;
  width: 100%;
  overflow: hidden;
  border-radius: 16px;
  aspect-ratio: 16 / 9;
  background: #121611;
}

.home-video-preview__media iframe {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
}

.home-video-preview__facade {
  padding: 0;
  border: 0;
  cursor: pointer;
}

.home-video-preview__facade img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform .5s cubic-bezier(.22, .61, .36, 1);
}

.home-video-preview__facade:hover img {
  transform: scale(1.03);
}

.home-video-preview__play {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.28);
  transition: background .25s ease;
}

.home-video-preview__play svg {
  width: 64px;
  height: 64px;
  fill: #fff;
  filter: drop-shadow(0 2px 10px rgba(0, 0, 0, .55));
}

.home-video-preview__facade:hover .home-video-preview__play {
  background: rgba(161, 12, 37, 0.38);
}

.home-video-preview__facade:focus-visible {
  outline: 2px solid var(--pillar-red-bright);
  outline-offset: 2px;
}

/* ── Tin nổi bật: TĨNH (v1 cuộn vô hạn 24s) ─────────
   Danh sách lấp phần dư của cột; nếu vẫn tràn thì khách tự cuộn.
   `data-lenis-prevent` để Lenis không cướp thao tác cuộn bên trong. */
.home-featured-news {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  padding: 6px;
}

.home-featured-news__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.home-featured-news__item {
  margin: 0;
}

.home-featured-news__link {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 8px;
  border-radius: 10px;
  text-decoration: none;
  color: inherit;
  background: rgba(255, 255, 255, 0.04);
  transition: background 0.2s ease, transform 0.2s ease;
}

.home-featured-news__link:hover {
  background: rgba(201, 168, 108, 0.16);
  transform: translateX(2px);
}

.home-featured-news__thumb {
  flex-shrink: 0;
  width: 56px;
  height: 42px;
  border-radius: 8px;
  overflow: hidden;
  background: #1f241b;
}

.home-featured-news__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.home-featured-news__body {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.home-featured-news__cat {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #c9a86c;
}

.home-featured-news__title {
  font-size: 12px;
  line-height: 1.35;
  color: #f4ebd0;
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Lối ra cho phần tin bị cắt khi cột trái thấp */
.home-featured-news__all {
  flex: 0 0 auto;
  margin-top: 10px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: #c9a86c;
  text-decoration: none;
}

.home-featured-news__all:hover {
  color: #f4ebd0;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.home-section-squares {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  align-items: start;
}

.home-section-item {
  width: 100%;
  display: block;
}

@media (max-width: 1023px) {
  .home-pillars {
    --pillar-gutter: 24px;
    padding-left: var(--pillar-gutter);
    padding-right: var(--pillar-gutter);
  }

  .home-pillars-col--left {
    position: static;
    max-width: none;
    max-height: none;
  }

  .home-section-squares {
    grid-template-columns: 1fr;
  }
}

/* Tablet: 2 card/hàng — v1 để 1 card/hàng nên trên màn 900px mỗi card rộng
   ~850px, cao ~484px, tạo một dải cuộn rất dài. Chỉ đổi lưới container,
   layout bên trong card không đổi. */
@media (min-width: 640px) and (max-width: 1023px) {
  .home-section-squares {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

/* ── Pillar thông tin (Giờ mở cửa + Liên hệ & Đặt lịch) ── */
/* Khớp hình học với .preview-link để xếp cùng lưới pillar */
.info-card {
  position: relative;
  display: block;
  width: 100%;
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
  width: 100%;
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
    /* rgba(30, 168, 53, .55) 55%, */
    rgba(97, 31, 1, 0) 100%
  );
}

.map-overlay:hover .map-cta {
  color: #fff;
}

/* ── Card liên hệ: TĨNH (v1 cuộn vô hạn 22s) ────────
   Nội dung (giờ mở cửa + 3 dòng liên hệ) vượt khung 346×197 khoá cứng, nên
   thay auto-scroll bằng cuộn tay. Mask chỉ mờ mép DƯỚI để gợi ý còn nội dung —
   v1 mờ cả hai mép nên dòng đầu luôn bị nhoè khi đứng yên. */
.info-viewport {
  position: absolute;
  inset: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  border-radius: 6px;
  -webkit-mask-image: linear-gradient(to bottom, #000 0, #000 84%, transparent 100%);
          mask-image: linear-gradient(to bottom, #000 0, #000 84%, transparent 100%);
}

.info-viewport:focus-visible {
  outline: 2px solid var(--pillar-red-bright);
  outline-offset: -2px;
}

/* Mật độ chặt hơn v1 để lọt tối đa nội dung vào khung tĩnh */
.info-set {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 16px 16px;
}

.info-heading {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 6px;
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
  gap: 5px;
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

.pillar-title {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 4;
  display: block;
  margin: 0;
  padding: 22px 12px 10px;
  font-size: 1rem;
  font-weight: 600;
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
    font-size: 1rem;
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
  width: 100%;
  margin-left: auto;
  margin-right: auto;
  max-width: 100%;
  aspect-ratio: 346 / 197;
  overflow: hidden;
  border-radius: 6px;
  background: #2a3326;
  border: 1px solid transparent;
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
  border-color: #cfcfcf;
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
    /* rgba(30, 168, 53, 0.62) 46%, */
    rgba(97, 36, 1, 0) 100%
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
  .preview-link::after,
  .home-video-preview__facade img {
    transition-duration: .01ms;
  }

  .preview-link:hover {
    transform: none;
    box-shadow: none;
    border-color: var(--pillar-red);
  }

  .preview-link:hover .preview-media img.img-responsive { transform: none; }
  .home-video-preview__facade:hover img { transform: none; }
}
</style>
