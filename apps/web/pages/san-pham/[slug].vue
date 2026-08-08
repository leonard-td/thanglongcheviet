<script setup lang="ts">
import type { Product } from '~/utils/storefront'
import { formatMoney } from '~/utils/storefront'
import { resolveStoreLoadError } from '~/utils/fetch-status'

const { t, locale } = useI18n()
const { getBySlug, categories } = useProducts()
const { addToCart, loading: cartLoading } = useCart()
const localePath = useLocalePath()
const route = useRoute()

useScrollAnimation()

const listUrl = computed(() => localePath('/san-pham-list'))
const slug = computed(() => {
  const raw = route.params.slug
  const value = Array.isArray(raw) ? raw[0] : raw
  return typeof value === 'string' ? value.trim() : ''
})

const loadMessages = () => ({
  notFound: t('products.notFound'),
  loadError: t('products.loadError'),
  configError: t('products.configError'),
})

const throwProductError = (error: unknown) => {
  const resolved = resolveStoreLoadError(error, loadMessages())
  throw createError({ ...resolved, fatal: true })
}

const added = ref(false)
const quantity = ref(1)
const selectedImage = ref<string | null>(null)
// null = no manual pick yet; the computed below falls back to the first
// variant's option combo. Kept separate from a "resolved" ref so the very
// first render (SSR included) can derive the default purely from `product`
// with no watcher-timing race (a plain ref set inside a watch/watchEffect
// isn't guaranteed to run before Nuxt's SSR render pass captures markup,
// which previously caused hydration mismatches on both the image and here).
const manualOptions = ref<Record<string, string> | null>(null)

const { data: productData, pending, error: productError, status } = await useAsyncData(
  () => `product-${slug.value || 'missing'}`,
  async () => {
    if (!slug.value) {
      return { product: null, relatedFromApi: [] as Product[] }
    }
    return getBySlug(slug.value)
  },
  { watch: [slug] },
)

const product = computed(() => productData.value?.product ?? null)
const relatedItems = computed(() => productData.value?.relatedFromApi ?? [])
const category = computed(() =>
  categories.value.find(c => c.id === product.value?.categoryId) ?? null,
)

if (productError.value) {
  throwProductError(productError.value)
}
if (status.value === 'success' && !product.value) {
  throw createError({ statusCode: 404, statusMessage: t('products.notFound'), fatal: true })
}

watchEffect(() => {
  // Avoid false 404/500 while client navigation refetches the same page component.
  if (status.value === 'pending' || status.value === 'idle') return
  if (productError.value) {
    throwProductError(productError.value)
  }
  if (status.value === 'success' && !product.value) {
    throw createError({ statusCode: 404, statusMessage: t('products.notFound'), fatal: true })
  }
})

// Nuxt reuses this component instance across client-side slug navigation —
// reset local UI state when the product actually changes.
watch(() => product.value?.id, () => {
  added.value = false
  quantity.value = 1
  selectedImage.value = null
  manualOptions.value = null
  quickBuyOpen.value = false
})

const activeImage = computed(() =>
  selectedImage.value ?? product.value?.gallery[0] ?? product.value?.image ?? '',
)

const selectedOptions = computed<Record<string, string>>(() =>
  manualOptions.value ?? { ...(product.value?.variants[0]?.optionValues ?? {}) },
)

const selectedVariant = computed(() => {
  if (!product.value) return null
  if (!product.value.options.length) return product.value.variants[0] ?? null
  return product.value.variants.find(v =>
    product.value!.options.every(o => v.optionValues[o.title] === selectedOptions.value[o.title]),
  ) ?? null
})

function isValueAvailable(optionTitle: string, value: string) {
  if (!product.value) return false
  const candidate = { ...selectedOptions.value, [optionTitle]: value }
  return product.value.variants.some(v =>
    product.value!.options.every(o => v.optionValues[o.title] === candidate[o.title]),
  )
}

function chooseOption(optionTitle: string, value: string) {
  manualOptions.value = { ...selectedOptions.value, [optionTitle]: value }
  added.value = false
}

const displayPrice = computed(() => selectedVariant.value?.price ?? product.value?.price ?? 0)
const priceText = computed(() =>
  formatMoney(displayPrice.value, product.value?.currencyCode ?? 'vnd', locale.value === 'en' ? 'en-US' : 'vi-VN'),
)

const missingOption = computed(() => {
  if (!product.value || selectedVariant.value) return null
  return product.value.options.find(o => !selectedOptions.value[o.title]) ?? product.value.options[0] ?? null
})

const canAddToCart = computed(() => Boolean(selectedVariant.value) && !cartLoading.value)

const incrementQty = () => { quantity.value++ }
const decrementQty = () => { if (quantity.value > 1) quantity.value-- }

const handleAddToCart = async () => {
  if (!selectedVariant.value) return
  const res = await addToCart(selectedVariant.value.id, quantity.value)
  if (res.success) added.value = true
  return res.success
}

const buyNowLoading = ref(false)
const handleBuyNow = async () => {
  buyNowLoading.value = true
  const ok = await handleAddToCart()
  buyNowLoading.value = false
  if (ok) await navigateTo(localePath('/gio-hang'))
}

// ── Modal mua nhanh (mở từ thanh mua nhanh cố định) ───────────────────
// Thanh cố định chỉ còn 2 nút; chọn thuộc tính + số lượng diễn ra trong
// modal này rồi mới thực hiện thêm vào giỏ / mua ngay theo mode đã bấm.
const quickBuyOpen = ref(false)
const quickBuyMode = ref<'add' | 'buy'>('add')

function openQuickBuy(mode: 'add' | 'buy') {
  quickBuyMode.value = mode
  added.value = false
  quickBuyOpen.value = true
}

const confirmQuickBuy = async () => {
  if (quickBuyMode.value === 'buy') {
    await handleBuyNow()
  } else {
    const ok = await handleAddToCart()
    if (ok) quickBuyOpen.value = false
  }
}

onKeyStroke('Escape', () => { quickBuyOpen.value = false })

// ── Kính lúp ảnh sản phẩm ─────────────────────────────────────────────
// Vòng lens bám theo con trỏ hiển thị vùng ảnh phóng to; khung ảnh chính
// giữ nguyên kích thước. Chỉ bật trên thiết bị có hover thật (chuột).
const ZOOM_SCALE = 2.2
const LENS_SIZE = 160
const zoomFrameEl = ref<HTMLElement | null>(null)
const zoomActive = ref(false)
const lensStyle = ref<Record<string, string>>({})

function onZoomEnter() {
  if (window.matchMedia('(hover: hover)').matches) {
    zoomActive.value = true
  }
}

function onZoomMove(e: MouseEvent) {
  const frame = zoomFrameEl.value
  if (!zoomActive.value || !frame) return
  const rect = frame.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  const half = LENS_SIZE / 2
  lensStyle.value = {
    width: `${LENS_SIZE}px`,
    height: `${LENS_SIZE}px`,
    left: `${Math.min(Math.max(x - half, 0), rect.width - LENS_SIZE)}px`,
    top: `${Math.min(Math.max(y - half, 0), rect.height - LENS_SIZE)}px`,
    backgroundImage: `url(${activeImage.value})`,
    backgroundSize: `${rect.width * ZOOM_SCALE}px ${rect.height * ZOOM_SCALE}px`,
    backgroundPosition: `${half - x * ZOOM_SCALE}px ${half - y * ZOOM_SCALE}px`,
  }
}

// ── Thanh mua nhanh cố định ───────────────────────────────────────────
// Khi khối chọn thuộc tính/số lượng/CTA gốc ra khỏi màn hình thì hiện
// thanh cố định đáy trang để thêm vào giỏ từ bất kỳ vị trí scroll nào.
const buyBoxEl = ref<HTMLElement | null>(null)
const showBuyBar = ref(false)
let buyBoxObserver: IntersectionObserver | null = null

// ConnectWidget (FAB Zalo/Facebook/Instagram) render toàn cục ở góc dưới
// trang, đè lên thanh mua nhanh khi thanh này hiện — đồng bộ để nó tự dịch
// lên trên.
const { setActive: setQuickBuyBarActive } = useQuickBuyBar()
watch(showBuyBar, (v) => setQuickBuyBarActive(v))

onMounted(() => {
  buyBoxObserver = new IntersectionObserver(([entry]) => {
    showBuyBar.value = !entry.isIntersecting
  })
  // buyBoxEl nằm trong v-else nên chỉ tồn tại sau khi product load xong
  watch(buyBoxEl, (el) => {
    buyBoxObserver?.disconnect()
    showBuyBar.value = false
    if (el) buyBoxObserver?.observe(el)
  }, { immediate: true })
})

onBeforeUnmount(() => {
  buyBoxObserver?.disconnect()
  setQuickBuyBarActive(false)
})

const specs = computed(() => {
  if (!product.value) return []
  const rows: { label: string, value: string }[] = []
  if (product.value.categoryName) {
    rows.push({ label: t('products.specs.category'), value: product.value.categoryName })
  }
  if (product.value.material) {
    rows.push({ label: t('products.specs.material'), value: product.value.material })
  }
  if (product.value.weight) {
    const kg = product.value.weight / 1000
    rows.push({
      label: t('products.specs.weight'),
      value: kg >= 1 ? `${kg.toLocaleString('vi-VN')} kg` : `${product.value.weight} g`,
    })
  }
  return rows
})

useSeoMeta({
  title: () => product.value?.title,
  description: () => product.value?.shortDesc,
  ogTitle: () => product.value?.title,
  ogDescription: () => product.value?.shortDesc,
  ogImage: () => product.value?.image,
  ogType: 'website',
  twitterCard: 'summary_large_image',
  twitterTitle: () => product.value?.title,
  twitterDescription: () => product.value?.shortDesc,
  twitterImage: () => product.value?.image,
})

useProductStructuredData(product)
</script>

<template>
  <div class="bg-dark text-white min-h-[70vh]">
    <!-- Loading skeleton — shown while useAsyncData is pending (initial load
         and client-side navigation to a different product both go through
         this), so the page never looks empty while the API responds. -->
    <section v-if="!product" class="section-py" aria-busy="true" :aria-label="t('common.loading')">
      <div class="container-page">
        <div class="mb-6 h-4 w-56 bg-white/5 rounded animate-pulse" />
        <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,3.5fr)_minmax(0,8.5fr)] gap-8 lg:gap-12">
          <div class="aspect-square rounded-2xl bg-white/5 animate-pulse" />
          <div class="space-y-4">
            <div class="h-3 w-24 bg-white/5 rounded animate-pulse" />
            <div class="h-9 w-3/4 bg-white/5 rounded animate-pulse" />
            <div class="h-7 w-32 bg-white/5 rounded animate-pulse" />
            <div class="h-4 w-full bg-white/5 rounded animate-pulse" />
            <div class="h-4 w-5/6 bg-white/5 rounded animate-pulse" />
            <div class="h-11 w-full bg-white/5 rounded mt-6 animate-pulse" />
          </div>
        </div>
      </div>
    </section>

    <section v-else class="section-py">
      <div class="container-page">

        <!-- Cột gallery thu ~30% (5fr → 3.5fr) theo yêu cầu UI -->
        <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,3.5fr)_minmax(0,8.5fr)] gap-8 lg:gap-12">
          <!-- Gallery: thumbnail dọc bên trái, ảnh chính có kính lúp khi hover -->
          <div class="animate-on-scroll lg:sticky lg:top-24 lg:self-start">
            <div class="flex flex-col-reverse sm:flex-row gap-3">
              <div v-if="product.gallery.length > 1"
                class="flex sm:flex-col gap-3 flex-none overflow-x-auto sm:overflow-x-visible sm:max-h-[440px] sm:overflow-y-auto">
                <button v-for="(img, i) in product.gallery" :key="i" type="button"
                  class="relative aspect-square w-16 flex-none overflow-hidden rounded-lg border-2 transition-colors"
                  :class="img === activeImage ? 'border-primary-500' : 'border-transparent opacity-60 hover:opacity-100'"
                  @click="selectedImage = img">
                  <img :src="img" :alt="`${product.title} ${i + 1}`" class="w-full h-full object-cover">
                </button>
              </div>

              <div ref="zoomFrameEl"
                class="relative flex-1 min-w-0 aspect-square overflow-hidden rounded-2xl bg-[#2a3326] shadow-2xl cursor-crosshair"
                @mouseenter="onZoomEnter" @mouseleave="zoomActive = false" @mousemove="onZoomMove">
                <img :src="activeImage" :alt="product.title" class="w-full h-full object-cover">
                <div v-show="zoomActive" class="zoom-lens" :style="lensStyle" aria-hidden="true" />
              </div>
            </div>
          </div>

          <!-- Info: Highlights bên trái (260px), khối mua hàng bên phải (từ xl).
               Mobile: Highlights trước, rồi tới nội dung mua hàng. -->
          <div class="animate-on-scroll" :class="specs.length ? 'xl:grid xl:grid-cols-[260px_minmax(0,1fr)] xl:gap-10' : ''">
            <!-- Đặc điểm nổi bật -->
            <aside v-if="specs.length"
              class="mb-8 xl:mb-0 pb-6 xl:pb-0 border-b border-white/10 xl:border-b-0 xl:border-r xl:border-white/10 xl:pr-8">
              <h2 class="text-xs uppercase tracking-widest text-white/50 mb-4 font-semibold">
                {{ t('products.featuresTitle') }}
              </h2>
              <dl class="space-y-2">
                <div v-for="row in specs" :key="row.label"
                  class="flex justify-between text-sm py-1.5 border-b border-white/5">
                  <dt class="text-white/50">{{ row.label }}</dt>
                  <dd class="text-white/85 text-right">{{ row.value }}</dd>
                </div>
              </dl>
            </aside>

            <div class="min-w-0">
              <h1 class="font-heading text-3xl md:text-4xl font-bold mb-3 leading-tight">{{ product.title }}</h1>
              <p class="text-2xl font-semibold text-primary-400 mb-5">{{ priceText }}</p>
              <!-- <p class="text-white/70 leading-relaxed mb-6">{{ product.shortDesc }}</p> -->

            <!-- Variant / option selectors -->
            <div v-if="product.options.length" class="space-y-5 mb-6">
              <div v-for="opt in product.options" :key="opt.id">
                <p class="text-xs uppercase tracking-widest text-white/50 mb-2">
                  {{ opt.title }}
                  <span v-if="selectedOptions[opt.title]" class="text-white/80">— {{ selectedOptions[opt.title]
                    }}</span>
                </p>
                <div class="flex flex-wrap gap-2">
                  <button v-for="val in opt.values" :key="val" type="button"
                    class="min-h-[40px] px-4 border text-sm transition-colors" :class="[
                      selectedOptions[opt.title] === val
                        ? 'border-primary-500 bg-primary-500/15 text-primary-300'
                        : 'border-white/20 text-white/70 hover:border-white/40',
                      !isValueAvailable(opt.title, val) ? 'opacity-30 cursor-not-allowed line-through' : '',
                    ]" :disabled="!isValueAvailable(opt.title, val)" @click="chooseOption(opt.title, val)">
                    {{ val }}
                  </button>
                </div>
              </div>
              <p v-if="missingOption" class="text-xs text-amber-400/90">
                {{ t('products.chooseOption', { option: missingOption.title }) }}
              </p>
            </div>

            <!-- Quantity + CTA (mốc theo dõi cho thanh mua nhanh cố định) -->
            <div ref="buyBoxEl" class="mb-4">
              <p class="text-xs uppercase tracking-widest text-white/50 mb-2">
                {{ t('cart.quantity') }}
              </p>
              <div class="flex flex-wrap flex-col items-stretch gap-3">
                <div class="flex items-center border border-white/20 max-w-[fit-content]">
                  <button type="button"
                    class="w-11 min-h-[44px] flex items-center justify-center text-white/70 hover:text-white disabled:opacity-30"
                    :disabled="quantity <= 1" :aria-label="t('cart.decrease')" @click="decrementQty">
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                  <span class="w-10 text-center text-sm tabular-nums">{{ quantity }}</span>
                  <button type="button"
                    class="w-11 min-h-[44px] flex items-center justify-center text-white/70 hover:text-white"
                    :aria-label="t('cart.increase')" @click="incrementQty">
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="m18 15-6-6-6 6" />
                    </svg>
                  </button>
                </div>
                <div class="flex-1 flex gap-3 flex items-center">
                  <button type="button" class="btn-primary min-h-[44px] flex-1 disabled:opacity-60 max-w-[fit-content] rounded-full"
                    :disabled="!canAddToCart" @click="handleAddToCart">
                    {{ added ? t('cart.added') : t('cart.add') }}
                  </button>

                  <button type="button" class="min-h-[44px] flex-1 px-6 border-2 border-primary-500 text-primary-400 font-condensed text-xs uppercase tracking-[0.15em]
                         hover:bg-primary-500 hover:text-white transition-colors disabled:opacity-60 max-w-[fit-content] rounded-full"
                    :disabled="!canAddToCart || buyNowLoading" @click="handleBuyNow">
                    {{ t('products.buyNow') }}
                  </button>
                </div>
              </div>
            </div>

            <div class="flex flex-wrap gap-x-5 gap-y-2 mb-8 text-xs">
              <NuxtLink :to="localePath('/gio-hang')"
                class="text-white/60 hover:text-primary-400 transition-colors underline">
                {{ t('cart.view') }}
              </NuxtLink>
              <NuxtLink :to="listUrl" class="text-white/60 hover:text-primary-400 transition-colors underline">
                {{ t('products.backToList') }}
              </NuxtLink>
            </div>

            <!-- Trust badges — flex-wrap instead of viewport-breakpoint grid-cols:
                 this column's actual width depends on whether the specs aside
                 rendered (see `specs.length` above), not on the viewport alone,
                 so a fixed xl:/2xl: column count can end up far wider than the
                 content and strand the last badge on its own line. -->
            <div class="flex flex-wrap gap-x-6 gap-y-3 mb-8 border-t border-white/10 pt-6">
              <div class="flex items-center gap-2.5 text-xs text-white/65 max-w-[fit-content]">
                <svg class="w-5 h-5 flex-shrink-0 text-primary-400" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                  <path d="M12 21c-4.5-2.5-7-6-7-10a7 7 0 0 1 14 0c0 4-2.5 7.5-7 10Z" stroke-linecap="round"
                    stroke-linejoin="round" />
                  <path d="M12 12v5" stroke-linecap="round" />
                </svg>
                <span>{{ t('products.trustQuality') }}</span>
              </div>
              <div class="flex items-center gap-2.5 text-xs text-white/65 max-w-[fit-content]">
                <svg class="w-5 h-5 flex-shrink-0 text-primary-400" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                  <path d="M3 7h11v10H3z" stroke-linecap="round" stroke-linejoin="round" />
                  <path d="M14 10h4l3 3v4h-7z" stroke-linecap="round" stroke-linejoin="round" />
                  <circle cx="7" cy="18" r="1.6" />
                  <circle cx="17.5" cy="18" r="1.6" />
                </svg>
                <span>{{ t('products.trustShipping') }}</span>
              </div>
              <div class="flex items-center gap-2.5 text-xs text-white/65 max-w-[fit-content]">
                <svg class="w-5 h-5 flex-shrink-0 text-primary-400" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                  <path d="M12 3l7 3v5c0 5-3 8.5-7 10-4-1.5-7-5-7-10V6z" stroke-linecap="round"
                    stroke-linejoin="round" />
                  <path d="m9 12 2 2 4-4" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
                <span>{{ t('products.trustReturn') }}</span>
              </div>
            </div>
            </div>
          </div>
        </div>

        <!-- Mô tả sản phẩm -->
        <div class="mt-16 max-w-3xl animate-on-scroll">
          <h2 class="pb-3 mb-5 border-b border-white/10 text-sm font-semibold uppercase tracking-[0.12em] text-primary-400">
            {{ t('products.descTitle') }}
          </h2>
          <div class="prose prose-invert max-w-none text-white/70 leading-relaxed" v-html="product.description" />
        </div>
      </div>
    </section>

    <section v-if="relatedItems.length" class="section-py bg-dark-800" aria-label="Related products">
      <div class="container-page">
        <h2 class="section-heading text-2xl md:text-3xl text-center mb-3">{{ t('products.related') }}</h2>
        <div class="divider-gold mb-10" />
        <!-- Sản phẩm liên quan: 4 cột, kích thước thu ~50% -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <article v-for="p in relatedItems" :key="p.id" class="group flex flex-col">
            <NuxtLink :to="localePath(`/san-pham/${p.slug}`)" :aria-label="p.title"
              class="relative block aspect-[346/197] overflow-hidden rounded-md bg-[#2a3326] shadow-lg">
              <img :src="p.image" :alt="p.title" loading="lazy"
                class="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105">
              <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-2 pt-6">
                <h3
                  class="text-white text-xs uppercase tracking-[0.12em] font-semibold transition-colors group-hover:text-primary-300 line-clamp-1">
                  {{ p.title }}
                </h3>
              </div>
            </NuxtLink>
            <!-- <p v-if="p.shortDesc" class="mt-1 text-center text-white/45 text-[11px] leading-snug line-clamp-1">
              {{ p.shortDesc }}
            </p> -->
            <div class="mt-2 flex items-center justify-between gap-2 mt-auto pt-2">
              <p class="text-primary-400 text-xs font-semibold p-0 mb-0">
                {{ formatMoney(p.price, p.currencyCode, locale === 'en' ? 'en-US' : 'vi-VN') }}
              </p>
              <ProductCardActions :variant-id="p.variantId" :slug="p.slug" :in-stock="p.inStock" icon-only />
            </div>
          </article>
        </div>
      </div>
    </section>

    <!-- ── Thanh mua nhanh cố định ──────────────────────────────────────
         Hiện khi khối chọn thuộc tính/số lượng/CTA gốc ra khỏi màn hình,
         để thêm vào giỏ nhanh từ bất kỳ vị trí scroll nào. -->
    <Transition name="buybar">
      <div v-if="product && showBuyBar" class="fixed inset-x-0 bottom-0 z-[900] border-t border-primary-500/25
               bg-[#1f1f1f]/95 backdrop-blur shadow-[0_-8px_24px_rgba(0,0,0,0.35)]">
        <div class="container-page flex items-center justify-end gap-3 md:gap-5 py-2.5">
          <img :src="activeImage" :alt="product.title"
            class="hidden sm:block h-11 w-11 flex-none rounded-lg object-cover ring-1 ring-white/10">
          <div class="hidden sm:block min-w-0 flex-1">
            <p class="truncate text-sm font-semibold text-white">{{ product.title }}</p>
            <p class="text-sm font-semibold text-primary-400">{{ priceText }}</p>
          </div>

          <button type="button" class="btn-primary !min-h-[40px] flex-none px-4 sm:px-6" @click="openQuickBuy('add')">
            {{ t('cart.add') }}
          </button>

          <button type="button" class="min-h-[40px] flex-none px-4 sm:px-6 border-2 border-primary-500 text-primary-400 font-condensed text-xs uppercase tracking-[0.15em]
                   hover:bg-primary-500 hover:text-white transition-colors" @click="openQuickBuy('buy')">
            {{ t('products.buyNow') }}
          </button>
        </div>
      </div>
    </Transition>

    <!-- ── Modal mua nhanh ──────────────────────────────────────────────
         Mở từ thanh mua nhanh cố định: chọn thuộc tính + số lượng rồi
         xác nhận thêm vào giỏ hoặc mua ngay theo nút đã bấm. -->
    <Transition name="qbmodal">
      <div v-if="product && quickBuyOpen"
        class="fixed inset-0 z-[950] flex items-end justify-center sm:items-center sm:p-4">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" @click="quickBuyOpen = false" />

        <div role="dialog" aria-modal="true" :aria-label="product.title" class="qbmodal-panel relative w-full sm:max-w-md max-h-[85vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl
                 border border-white/10 bg-[#1f1f1f] p-5 shadow-[0_-8px_40px_rgba(0,0,0,0.5)]">
          <div class="flex items-start gap-3 mb-5">
            <img :src="activeImage" :alt="product.title"
              class="h-16 w-16 flex-none rounded-lg object-cover ring-1 ring-white/10">
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-white leading-snug">{{ product.title }}</p>
              <p class="mt-1 text-base font-semibold text-primary-400">{{ priceText }}</p>
            </div>
            <button type="button"
              class="flex h-8 w-8 flex-none items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              :aria-label="t('common.close')" @click="quickBuyOpen = false">
              ✕
            </button>
          </div>

          <div v-if="product.options.length" class="space-y-4 mb-5">
            <div v-for="opt in product.options" :key="opt.id">
              <p class="text-xs uppercase tracking-widest text-white/50 mb-2">
                {{ opt.title }}
                <span v-if="selectedOptions[opt.title]" class="text-white/80">— {{ selectedOptions[opt.title] }}</span>
              </p>
              <div class="flex flex-wrap gap-2">
                <button v-for="val in opt.values" :key="val" type="button"
                  class="min-h-[40px] px-4 border text-sm transition-colors" :class="[
                    selectedOptions[opt.title] === val
                      ? 'border-primary-500 bg-primary-500/15 text-primary-300'
                      : 'border-white/20 text-white/70 hover:border-white/40',
                    !isValueAvailable(opt.title, val) ? 'opacity-30 cursor-not-allowed line-through' : '',
                  ]" :disabled="!isValueAvailable(opt.title, val)" @click="chooseOption(opt.title, val)">
                  {{ val }}
                </button>
              </div>
            </div>
            <p v-if="missingOption" class="text-xs text-amber-400/90">
              {{ t('products.chooseOption', { option: missingOption.title }) }}
            </p>
          </div>

          <div class="flex items-center justify-between mb-5">
            <p class="text-xs uppercase tracking-widest text-white/50">{{ t('cart.quantity') }}</p>
            <div class="flex items-center border border-white/20">
              <button type="button"
                class="flex min-h-[40px] w-10 items-center justify-center text-white/70 hover:text-white disabled:opacity-30"
                :disabled="quantity <= 1" :aria-label="t('cart.decrease')" @click="decrementQty">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              <span class="w-10 text-center text-sm tabular-nums">{{ quantity }}</span>
              <button type="button"
                class="flex min-h-[40px] w-10 items-center justify-center text-white/70 hover:text-white"
                :aria-label="t('cart.increase')" @click="incrementQty">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="m18 15-6-6-6 6" />
                </svg>
              </button>
            </div>
          </div>

          <button v-if="quickBuyMode === 'add'" type="button" class="btn-primary w-full disabled:opacity-60"
            :disabled="!canAddToCart" @click="confirmQuickBuy">
            {{ added ? t('cart.added') : t('cart.add') }}
          </button>
          <button v-else type="button" class="w-full min-h-[44px] px-6 border-2 border-primary-500 text-primary-400 font-condensed text-xs uppercase tracking-[0.15em]
                   hover:bg-primary-500 hover:text-white transition-colors disabled:opacity-60"
            :disabled="!canAddToCart || buyNowLoading" @click="confirmQuickBuy">
            {{ t('products.buyNow') }}
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* Vòng kính lúp bám theo con trỏ trên ảnh chính */
.zoom-lens {
  position: absolute;
  border-radius: 9999px;
  border: 2px solid rgba(221, 160, 77, 0.85);
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.35), 0 10px 30px rgba(0, 0, 0, 0.45);
  background-repeat: no-repeat;
  background-color: #2a3326;
  pointer-events: none;
}

.buybar-enter-active,
.buybar-leave-active {
  transition: transform 0.25s ease, opacity 0.25s ease;
}

.buybar-enter-from,
.buybar-leave-to {
  transform: translateY(100%);
  opacity: 0;
}

.qbmodal-enter-active,
.qbmodal-leave-active {
  transition: opacity 0.2s ease;
}

.qbmodal-enter-active .qbmodal-panel,
.qbmodal-leave-active .qbmodal-panel {
  transition: transform 0.25s ease;
}

.qbmodal-enter-from,
.qbmodal-leave-to {
  opacity: 0;
}

.qbmodal-enter-from .qbmodal-panel,
.qbmodal-leave-to .qbmodal-panel {
  transform: translateY(24px);
}
</style>
