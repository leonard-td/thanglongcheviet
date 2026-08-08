// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  // Cho phép truy cập dev server qua bất kỳ domain/host nào trỏ vào server
  // này (DDNS, LAN, domain thật...) thay vì phải liệt kê từng domain.
  vite: {
    server: {
      allowedHosts: true,
    },
  },

  nitro: {
    routeRules: {
      '/api/**': {
        proxy: `${process.env.NUXT_API_PROXY_TARGET || 'http://127.0.0.1:8000'}/api/**`,
      },
    },
  },

  modules: [
    '@nuxtjs/i18n',
    '@nuxt/image',
    '@vueuse/nuxt',
  ],

  css: [
    '~/assets/css/main.css',
    '~/assets/css/bootstrap.css',
    '~/assets/css/style.css',
    '~/assets/css/modis-footer.css',
    '~/assets/css/modis-product-list.css',
  ],

  // i18n configuration
  i18n: {
    restructureDir: false,
    defaultLocale: 'vi',
    strategy: 'prefix_except_default',
    customRoutes: 'config',
    pages: {
      'san-pham-list': { en: '/products', vi: '/san-pham-list' },
      'san-pham-slug': { en: '/products/[slug]', vi: '/san-pham/[slug]' },
      'san-pham-danh-muc-slug': { en: '/products/category/[slug]', vi: '/san-pham/danh-muc/[slug]' },
      'san-pham-bo-suu-tap-slug': { en: '/products/collection/[slug]', vi: '/san-pham/bo-suu-tap/[slug]' },
      'dich-vu': { en: '/services', vi: '/dich-vu' },
      'doi-ngu': { en: '/team', vi: '/doi-ngu' },
      'lang-nghe': { en: '/craft-village', vi: '/lang-nghe' },
      gallery: { en: '/gallery', vi: '/gallery' },
      'tin-tuc': { en: '/blog', vi: '/tin-tuc' },
      'tin-tuc-slug': { en: '/blog/[slug]', vi: '/tin-tuc/[slug]' },
      'trai-nghiem': { en: '/events', vi: '/trai-nghiem' },
      'trai-nghiem-slug': { en: '/events/[slug]', vi: '/trai-nghiem/[slug]' },
      'gio-hang': { en: '/cart', vi: '/gio-hang' },
      'lien-he': { en: '/contact', vi: '/lien-he' },
      'tai-khoan': { en: '/account', vi: '/tai-khoan' },
      'tra-cuu-don': { en: '/order-tracking', vi: '/tra-cuu-don' },
      'thanh-toan-ket-qua': { en: '/payment/result', vi: '/thanh-toan/ket-qua' },
    },
    bundle: {
      optimizeTranslationDirective: false,
    },
    locales: [
      { code: 'vi', language: 'vi-VN', name: 'Tiếng Việt', file: 'vi.json' },
      { code: 'en', language: 'en-US', name: 'English', file: 'en.json' },
    ],
    langDir: 'locales/',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_locale',
      fallbackLocale: 'vi',
    },
  },

  // Image optimization
  image: {
    quality: 85,
    formats: ['webp', 'avif'],
    domains: ['images.unsplash.com', 'localhost', '127.0.0.1'],
    screens: {
      xs: 375,
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
      xxl: 1536,
    },
  },

  // Runtime config
  runtimeConfig: {
    apiProxyTarget: process.env.NUXT_API_PROXY_TARGET || 'http://127.0.0.1:8000',
    // SSR-only Medusa URL override. In docker the browser reaches the backend
    // at localhost:9000 (published port) but the web container itself must use
    // the compose service DNS (http://backend:9000) — set
    // NUXT_MEDUSA_BACKEND_URL_SERVER there. Empty = use the public URL.
    medusaBackendUrlServer: process.env.NUXT_MEDUSA_BACKEND_URL_SERVER || '',
    public: {
      siteName: 'Thăng Long Chè Việt',
      googleMapsApiKey: process.env.NUXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
      // Medusa commerce backend (products + cart/checkout). Publishable key
      // and region id are auto-provisioned by
      // apps/admin-medusa/scripts/setup-web-integration.mjs — no manual
      // dashboard setup needed.
      // `??` (not `||`): an explicit empty string means "same origin as the
      // page" (see useMedusaApi.ts) so the browser calls whatever domain it's
      // currently on instead of one hardcoded backend host — that must NOT
      // fall back to the localhost default just because it's falsy.
      medusaBackendUrl: process.env.NUXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000',
      medusaPublishableKey: process.env.NUXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || '',
      medusaRegionId: process.env.NUXT_PUBLIC_MEDUSA_REGION_ID || '',
      // Legacy — store resolves Active menu server-side; kept for env compat.
      medusaNavigationId: process.env.NUXT_PUBLIC_MEDUSA_NAVIGATION_ID || '',
    },
  },

  // App head defaults
  app: {
    head: {
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1',
      link: [
        { rel: 'icon', type: 'image/png', href: '/tlcv_logo.png' },
        { rel: 'apple-touch-icon', href: '/tlcv_logo.png' },
        {
          rel: 'preconnect',
          href: 'https://fonts.googleapis.com',
        },
        {
          rel: 'preconnect',
          href: 'https://fonts.gstatic.com',
          crossorigin: '',
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
        },
        {
          rel: 'stylesheet',
          href: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css',
        },
      ],
    },
  },

  // PostCSS (replaces postcss.config.js)
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },

  // TypeScript
  typescript: {
    strict: true,
    typeCheck: false,
  },
})
