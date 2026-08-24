<script setup lang="ts">
import type { NavLink, NavLinkType } from '~/composables/useNavigation'
import { PLACEHOLDER_IMAGE } from '~/utils/storefront'
import AppHeaderMegaMenu from './AppHeaderMegaMenu.vue'
import type { MegaMenuSection, MegaMenuItem } from './AppHeaderMegaMenu.vue'

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

// Products nav items: bucket children into sections by linkType so categories,
// collections, and other links each get their own labelled group in the grid.
const PRODUCT_SECTIONS: { linkTypes: NavLinkType[] | null; titleKey: string }[] = [
  { linkTypes: ['product_category'], titleKey: 'products.browseCategories' },
  { linkTypes: ['product_collection'], titleKey: 'products.browseCollections' },
  { linkTypes: null, titleKey: 'nav.productsMenu.moreTitle' },
]

function buildMegaMenuSections(link: NavLink): MegaMenuSection[] {
  const children = link.children ?? []
  if (!children.length) return []

  const hasProductTypes = children.some(
    c => c.linkType === 'product_category' || c.linkType === 'product_collection',
  )

  if (hasProductTypes) {
    const buckets = new Map<string, MegaMenuItem[]>()
    for (const child of children) {
      const section = PRODUCT_SECTIONS.find(
        s => s.linkTypes === null || (child.linkType && s.linkTypes.includes(child.linkType)),
      )!
      const items = buckets.get(section.titleKey) ?? []
      items.push({
        key: child.key,
        path: child.path,
        label: child.label || t(child.key),
        image: child.thumbnail || PLACEHOLDER_IMAGE,
        openInNewTab: child.openInNewTab,
      })
      buckets.set(section.titleKey, items)
    }
    return PRODUCT_SECTIONS
      .filter(s => buckets.has(s.titleKey))
      .map(s => ({ key: s.titleKey, title: t(s.titleKey), items: buckets.get(s.titleKey)! }))
  }

  // News / other: single flat section — admin configures children via Điều hướng
  return [{
    key: link.key,
    title: '',
    items: children.map(child => ({
      key: child.key,
      path: child.path,
      label: child.label || t(child.key),
      image: child.thumbnail || PLACEHOLDER_IMAGE,
      openInNewTab: child.openInNewTab,
    })),
  }]
}

function megaMenuConfig(link: NavLink) {
  const children = link.children ?? []
  const isProducts = children.some(
    c => c.linkType === 'product_category' || c.linkType === 'product_collection',
  )
  const isNews = children.some(c => c.linkType === 'post' || c.linkType === 'post_topic')
  return {
    viewAllPath: link.path,
    viewAllLabel: isProducts
      ? t('products.viewAllProducts')
      : isNews
        ? t('blog.viewAll')
        : link.label || t(link.key),
    minWidth: isProducts ? 'min(720px, 90vw)' : 'min(640px, 90vw)',
    maxWidth: isProducts ? '920px' : '820px',
  }
}

// Fetch nav from GET /store/navigations — backend only returns items with
// is_active = true (both menu-level and item-level filtering). useAsyncData
// runs on the server during SSR so nav renders on first paint without a flash.
const { getStoreNavigation, mapNavigationToNavLinks } = useNavigation()
const { data: navLinks } = await useAsyncData<NavLink[]>(
  'store-navigation',
  async () => {
    const rawNav = await getStoreNavigation()
    return rawNav.length > 0 ? mapNavigationToNavLinks(rawNav) : []
  },
  { default: () => [] as NavLink[] },
)

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
              v-if="link.children?.length && openDropdown === link.key"
              class="site-dropdown site-dropdown-mega"
            >
              <AppHeaderMegaMenu
                :sections="buildMegaMenuSections(link)"
                v-bind="megaMenuConfig(link)"
              />
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
        :aria-label="t(isMenuOpen ? 'nav.closeMenu' : 'nav.openMenu')"
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

.site-mobile-sublink-thumb {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  object-fit: cover;
  flex-shrink: 0;
  margin-right: .6rem;
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
