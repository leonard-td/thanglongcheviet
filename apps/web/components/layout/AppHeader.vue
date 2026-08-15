<script setup lang="ts">
import type { Component } from 'vue'
import LayoutAppHeaderProductsMenu from './AppHeaderProductsMenu.vue'
import LayoutAppHeaderNewsMenu from './AppHeaderNewsMenu.vue'

const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()

const isMenuOpen = ref(false)
const openDropdown = ref<string | null>(null)
const openMobileGroup = ref<string | null>(null)

// Trang có banner nâng ngưỡng này lên bằng chiều cao banner (useBannerHeader);
// reset về mặc định mỗi lần đổi route để trang thường giữ hành vi cũ.
const solidThreshold = useHeaderSolidThreshold()

watch(() => route.path, () => {
  isMenuOpen.value = false
  openDropdown.value = null
  openMobileGroup.value = null
  solidThreshold.value = DEFAULT_HEADER_SOLID_THRESHOLD
})

const { y: scrollY } = useWindowScroll()
const isSolid = computed(() => scrollY.value > solidThreshold.value || isMenuOpen.value)

const { totalItems } = useCart()

// The products nav item gets an image-led mega menu (categories/collections
// with thumbnails) instead of the plain text dropdown other nav items use.
// '/san-pham-list' + 'nav.products' match the hardcoded static fallback list
// below; '/san-pham' is the real "Sản phẩm" item's url as created in
// Admin > Điều hướng (GET /store/navigations) — the two never share a path,
// so both must be checked.
const isProductsLink = (link: NavLink) =>
  link.path === '/san-pham-list' || link.path === '/san-pham' || link.key === 'nav.products'

// Same treatment for the blog/news nav item — topics + latest post banner
// instead of a plain text dropdown.
const isNewsLink = (link: NavLink) => link.path === '/tin-tuc' || link.key === 'nav.blog'

// Nav items that get an image-tile mega menu instead of the plain text
// dropdown, matched to the component that supplies its data (see
// AppHeaderMegaMenu.vue for the shared presentational shell both render
// through). Add a new mega menu type here — one line, no template edits.
const MEGA_MENU_VARIANTS: { matches: (link: NavLink) => boolean, component: Component }[] = [
  { matches: isProductsLink, component: LayoutAppHeaderProductsMenu },
  { matches: isNewsLink, component: LayoutAppHeaderNewsMenu },
]

const megaMenuFor = (link: NavLink) => MEGA_MENU_VARIANTS.find(v => v.matches(link))?.component ?? null

interface NavLink {
  key: string
  path: string
  label?: string
  openInNewTab?: boolean
  thumbnail?: string | null
  icon?: string | null
  displayMode?: 'none' | 'icon' | 'image' | null
  children?: {
    key: string
    path: string
    label?: string
    openInNewTab?: boolean
    thumbnail?: string | null
    linkType?: 'product' | 'product_category' | 'product_collection' | 'product_topic' | 'post' | 'post_topic' | 'event' | 'event_topic' | null
  }[]
}

const { getStoreNavigation, mapNavigationToNavLinks } = useNavigation()
const dynamicLinks = ref<NavLink[]>([])

onMounted(async () => {
  try {
    const rawNav = await getStoreNavigation()
    if (rawNav && rawNav.length > 0) {
      dynamicLinks.value = mapNavigationToNavLinks(rawNav)
    }
  } catch (e) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[AppHeader] Failed to load dynamic navigation, falling back to static:', e)
    }
  }
})

const navLinks = computed<NavLink[]>(() => {
  if (dynamicLinks.value.length > 0) {
    return dynamicLinks.value
  }

  return [
    // { key: 'nav.home', path: '/' },
    { key: 'nav.about', path: '/gioi-thieu' },
    {
      key: 'nav.products',
      path: '/san-pham-list',
      children: [
        { key: 'nav.productsMenu.teaViet', path: '/san-pham/danh-muc/thang-long-che-viet' },
        { key: 'nav.productsMenu.anQuangCaffe', path: '/an-quang-caffe' },
        { key: 'nav.productsMenu.corporateGifts', path: '/qua-tang-doanh-nghiep' },
      ],
    },
    { key: 'nav.projectsPartners', path: '/du-an-doi-tac' },
    { key: 'nav.events', path: '/trai-nghiem' },
    {
      key: 'nav.blog',
      path: '/tin-tuc',
      children: [
        { key: 'nav.blogMenu.vietTea', path: '/nep-tra-viet' },
        { key: 'nav.blogMenu.tradition', path: '/van-hoa-viet' },
        { key: 'nav.blogMenu.teaHeritage', path: '/di-san-tra-cu' },
        { key: 'nav.blogMenu.anQuangGarden', path: '/vuon-an-quang' },
      ],
    },
    { key: 'nav.library', path: '/thu-vien-van-hoa' },
    { key: 'nav.contact', path: '/lien-he' },
  ]
})

const toggleMobileGroup = (key: string) => {
  openMobileGroup.value = openMobileGroup.value === key ? null : key
}

const desktopNavEl = ref<HTMLElement | null>(null)
onClickOutside(desktopNavEl, () => { openDropdown.value = null })
</script>

<template>
  <div
    class="site-header"
    :class="{ 'is-solid': isSolid }"
    role="banner"
  >
    <div class="site-header-inner container-page">
      <LayoutSiteLogo variant="header" class="site-header-logo" />

      <nav ref="desktopNavEl" class="max-lg:hidden lg:flex items-center gap-0 flex-1 justify-center min-w-0" aria-label="Main navigation">
        <div
          v-for="link in navLinks"
          :key="link.key"
          class="site-nav-item"
          @mouseenter="link.children && (openDropdown = link.key)"
          @mouseleave="link.children && (openDropdown = null)"
        >
          <div class="flex items-center">
            <NuxtLink
              :to="localePath(link.path)"
              class="site-nav-link"
              active-class="site-nav-active"
              :target="link.openInNewTab ? '_blank' : undefined"
              :rel="link.openInNewTab ? 'noopener noreferrer' : undefined"
            >
              <WidgetsIcon
                v-if="link.displayMode === 'icon' && link.icon"
                :name="link.icon as any"
                class="site-nav-link-icon"
              />
              <img
                v-else-if="link.displayMode === 'image' && link.thumbnail"
                :src="link.thumbnail"
                alt=""
                class="site-nav-link-thumb"
              >
              {{ link.label || t(link.key) }}
            </NuxtLink>
            <button
              v-if="link.children"
              type="button"
              class="site-nav-caret"
              :aria-expanded="openDropdown === link.key"
              :aria-label="`${link.label || t(link.key)} submenu`"
              @click="openDropdown = link.key"
            >
              <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
          </div>

          <Transition
            enter-active-class="transition-all duration-150"
            enter-from-class="opacity-0 -translate-y-1"
            leave-active-class="transition-all duration-100"
            leave-to-class="opacity-0 -translate-y-1"
          >
            <div
              v-if="link.children && openDropdown === link.key"
              class="site-dropdown"
              :class="{ 'site-dropdown-mega': !!megaMenuFor(link) }"
            >
              <component
                :is="megaMenuFor(link)"
                v-if="megaMenuFor(link)"
                :children="link.children || []"
              />
              <template v-else>
                <NuxtLink
                  v-for="child in link.children"
                  :key="child.key"
                  :to="localePath(child.path)"
                  class="site-dropdown-link"
                  :target="child.openInNewTab ? '_blank' : undefined"
                  :rel="child.openInNewTab ? 'noopener noreferrer' : undefined"
                >
                  <img
                    v-if="child.thumbnail"
                    :src="child.thumbnail"
                    alt=""
                    class="site-dropdown-link-thumb"
                  >
                  {{ child.label || t(child.key) }}
                </NuxtLink>
              </template>
            </div>
          </Transition>
        </div>
      </nav>

      <div class="max-lg:hidden lg:flex items-center gap-3">
        <NuxtLink
          :to="localePath('/gio-hang')"
          class="site-cart-link"
          :aria-label="t('cart.title')"
        >
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
            <path d="M6 6h15l-1.5 9h-12z" stroke-linejoin="round" />
            <path d="M6 6 5 3H2" stroke-linecap="round" stroke-linejoin="round" />
            <circle cx="9" cy="20" r="1" />
            <circle cx="18" cy="20" r="1" />
          </svg>
          <span v-if="totalItems > 0" class="site-cart-badge">{{ totalItems }}</span>
        </NuxtLink>
        <NuxtLink :to="localePath('/lien-he')" class="site-header-cta">
          {{ t('nav.bookNow') }}
        </NuxtLink>
      </div>

      <button
        class="lg:hidden p-2 text-[#f5f0e6] min-h-[44px] min-w-[44px] flex items-center justify-center"
        :aria-label="isMenuOpen ? 'Đóng menu' : 'Mở menu'"
        :aria-expanded="isMenuOpen"
        @click="isMenuOpen = !isMenuOpen"
      >
        <div class="w-6 flex flex-col gap-1.5">
          <span class="block h-0.5 bg-[#f5f0e6] transition-all duration-300" :class="isMenuOpen ? 'rotate-45 translate-y-2' : ''" />
          <span class="block h-0.5 bg-[#f5f0e6] transition-all duration-300" :class="isMenuOpen ? 'opacity-0' : ''" />
          <span class="block h-0.5 bg-[#f5f0e6] transition-all duration-300" :class="isMenuOpen ? '-rotate-45 -translate-y-2' : ''" />
        </div>
      </button>
    </div>

    <Transition
      enter-active-class="transition-all duration-300"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div v-if="isMenuOpen" class="lg:hidden site-header-mobile">
        <nav class="container-page py-4 flex flex-col" aria-label="Mobile navigation">
          <div v-for="link in navLinks" :key="link.key">
            <div class="flex items-stretch">
              <NuxtLink
                :to="localePath(link.path)"
                class="site-mobile-link flex-1"
                active-class="text-[#e8d5a8]"
                :target="link.openInNewTab ? '_blank' : undefined"
                :rel="link.openInNewTab ? 'noopener noreferrer' : undefined"
                @click="isMenuOpen = false"
              >
                <WidgetsIcon
                  v-if="link.displayMode === 'icon' && link.icon"
                  :name="link.icon as any"
                  class="site-nav-link-icon"
                />
                <img
                  v-else-if="link.displayMode === 'image' && link.thumbnail"
                  :src="link.thumbnail"
                  alt=""
                  class="site-nav-link-thumb"
                >
                {{ link.label || t(link.key) }}
              </NuxtLink>
              <button
                v-if="link.children"
                type="button"
                class="site-mobile-caret"
                :aria-expanded="openMobileGroup === link.key"
                :aria-label="`${link.label || t(link.key)} submenu`"
                @click="toggleMobileGroup(link.key)"
              >
                <svg
                  class="w-4 h-4 transition-transform duration-200"
                  :class="openMobileGroup === link.key ? 'rotate-180' : ''"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
            </div>
            <div v-if="link.children && openMobileGroup === link.key" class="site-mobile-submenu">
              <NuxtLink
                v-for="child in link.children"
                :key="child.key"
                :to="localePath(child.path)"
                class="site-mobile-sublink"
                :target="child.openInNewTab ? '_blank' : undefined"
                :rel="child.openInNewTab ? 'noopener noreferrer' : undefined"
                @click="isMenuOpen = false"
              >
                <img
                  v-if="child.thumbnail"
                  :src="child.thumbnail"
                  alt=""
                  class="site-mobile-sublink-thumb"
                >
                {{ child.label || t(child.key) }}
              </NuxtLink>
            </div>
          </div>
          <NuxtLink
            :to="localePath('/gio-hang')"
            class="site-mobile-link"
            @click="isMenuOpen = false"
          >
            {{ t('cart.title') }}
            <span v-if="totalItems > 0" class="ml-2 text-[#e8d5a8]">({{ totalItems }})</span>
          </NuxtLink>
          <div class="pt-4">
            <NuxtLink
              :to="localePath('/lien-he')"
              class="site-header-cta w-full justify-center"
              @click="isMenuOpen = false"
            >
              {{ t('nav.bookNow') }}
            </NuxtLink>
          </div>
        </nav>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.site-header {
  position: fixed !important;
  top: 0 !important;
  left: 0;
  right: 0;
  z-index: 950;
  background: transparent;
  border-bottom: 1px solid transparent;
  box-shadow: none;
  transition: background .3s ease, border-color .3s ease, box-shadow .3s ease;
}

.site-header.is-solid {
  /* Match layout bg (#1a1a1a) so nav stays readable over light product cards. */
  background: rgba(26, 26, 26, 0.96);
  border-bottom-color: rgba(255, 255, 255, 0.08);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.28);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
}

.site-header-inner {
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.site-header-logo {
  text-decoration: none;
}

.site-nav-link {
  display: inline-flex;
  align-items: center;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: .12em;
  color: rgba(245, 240, 230, .88);
  padding: .5rem .55rem;
  text-decoration: none;
  transition: color .2s ease;
  white-space: nowrap;
}

.site-nav-link-icon {
  width: 14px;
  height: 14px;
  margin-right: .4rem;
  flex-shrink: 0;
}

.site-nav-link-thumb {
  width: 18px;
  height: 18px;
  margin-right: .4rem;
  border-radius: 4px;
  object-fit: cover;
  flex-shrink: 0;
}

@media (min-width: 1280px) {
  .site-nav-link {
    font-size: 11px;
    letter-spacing: .15em;
    padding: .75rem .7rem;
  }
}

.site-nav-link:hover {
  color: #e8d5a8;
}

.site-nav-active {
  color: #e8d5a8 !important;
}

.site-nav-item {
  position: relative;
}

.site-nav-caret {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  min-height: 28px;
  margin-left: -4px;
  color: rgba(245, 240, 230, .6);
  transition: color .2s ease;
}

.site-nav-caret:hover {
  color: #e8d5a8;
}

.site-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  min-width: 240px;
  padding: .4rem 0;
  background: #1c2a1a;
  border: 1px solid rgba(201, 168, 108, .2);
  box-shadow: 0 12px 28px rgba(0, 0, 0, .35);
  z-index: 10;
}

.site-dropdown-mega {
  /* Centering on the trigger nav-item (like the plain dropdown does)
     overflows the viewport whenever that item isn't near page-center — e.g.
     "SẢN PHẨM" sits left-of-center, so a 720-920px mega panel centered under
     it runs off both edges on anything narrower than ~1400px. Anchor to the
     viewport instead of the trigger element, and clamp its width so it never
     exceeds the available space. */
  position: fixed;
  top: 72px;
  left: 50%;
  right: auto;
  transform: translateX(-50%);
  min-width: 0;
  max-width: calc(100vw - 2rem);
  padding: 0;
}

.site-dropdown-link {
  display: flex;
  align-items: center;
  gap: .6rem;
  padding: .65rem 1.1rem;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: .1em;
  color: rgba(245, 240, 230, .82);
  text-decoration: none;
  white-space: nowrap;
  transition: background .15s ease, color .15s ease;
}

.site-dropdown-link-thumb {
  width: 28px;
  height: 28px;
  border-radius: 4px;
  object-fit: cover;
  flex-shrink: 0;
}

.site-mobile-sublink-thumb {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  object-fit: cover;
  flex-shrink: 0;
  margin-right: .6rem;
}

.site-dropdown-link:hover {
  background: rgba(201, 168, 108, .12);
  color: #e8d5a8;
}

.site-mobile-caret {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  color: rgba(245, 240, 230, .7);
  border-bottom: 1px solid rgba(255, 255, 255, .06);
}

.site-mobile-submenu {
  display: flex;
  flex-direction: column;
  padding-left: 1rem;
  background: rgba(0, 0, 0, .15);
}

.site-mobile-sublink {
  color: rgba(245, 240, 230, .72);
  padding: .7rem .75rem;
  font-size: .8125rem;
  text-transform: uppercase;
  letter-spacing: .1em;
  border-bottom: 1px solid rgba(255, 255, 255, .06);
  text-decoration: none;
  min-height: 40px;
  display: flex;
  align-items: center;
  transition: color .2s ease;
}

.site-mobile-sublink:hover {
  color: #e8d5a8;
}

.site-cart-link {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  color: rgba(245, 240, 230, .88);
  text-decoration: none;
}

.site-cart-badge {
  position: absolute;
  top: 4px;
  right: 2px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 999px;
  background: #c41e3a;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  line-height: 18px;
  text-align: center;
}

.site-header-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: .6rem 1.25rem;
  background: #64231e;
  color: #d5b176;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .15em;
  text-decoration: none;
  transition: background .2s ease, color .2s ease;
}

.site-header-cta:hover {
  background: #752b26;
  color: #d5b176;
}

.site-header-mobile {
  background: #143222;
  border-top: 1px solid rgba(201, 168, 108, .2);
}

.site-mobile-link {
  color: rgba(245, 240, 230, .85);
  padding: .85rem .75rem;
  font-size: .875rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: .12em;
  border-bottom: 1px solid rgba(255, 255, 255, .06);
  text-decoration: none;
  min-height: 44px;
  display: flex;
  align-items: center;
  transition: color .2s ease;
}

.site-mobile-link:hover {
  color: #e8d5a8;
}
</style>
