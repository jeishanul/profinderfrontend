import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({

  modules: [
    '@nuxt/eslint',
    '@nuxt/image',
    '@nuxt/fonts',
    '@nuxt/icon',
    '@nuxtjs/seo',
    '@vueuse/nuxt',
    '@pinia/nuxt',
    'nuxt-security',
    '@nuxtjs/i18n',
    '@nuxtjs/color-mode',
  ],
  devtools: { enabled: true },

  // Favicon matches the brand mark (green rounded square + white leaf, same
  // as the header/footer logo badge) — see public/favicon.svg. SVG first
  // (crisp at any size, modern browsers prefer it); PNG fallbacks for
  // browsers/contexts that don't support SVG favicons.
  app: {
    head: {
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
      ],
    },
  },

  css: ['~/assets/css/main.css'],

  // --- SEO (@nuxtjs/seo: site-config, robots, sitemap, og-image, schema-org, seo-utils) ---
  site: {
    url: process.env.NUXT_PUBLIC_SITE_URL || 'http://162.35.24.95:3000',
    name: 'ProFinder',
    description: 'ProFinder',
    defaultLocale: 'en',
    indexable: process.env.NUXT_SITE_INDEXABLE === 'true',
  },

  // --- Theme toggle (AppHeader) ---
  colorMode: {
    classSuffix: '',
    preference: 'system',
    fallback: 'light',
    storageKey: 'color-mode',
  },

  // Server-only — read exclusively by the Nitro proxy layer in server/api/
  // Server-to-server direct internal call to Laravel backend port 8000
  runtimeConfig: {
    apiBaseUrl: process.env.NUXT_API_BASE_URL || 'http://127.0.0.1:8000',
  },

  // --- Hybrid rendering defaults; extend per-route as pages are added ---
  routeRules: {
    '/dashboard': { ssr: false, robots: false },
    '/profile': { ssr: false, robots: false },
    '/clients': { ssr: false, robots: false },
    '/purchases': { ssr: false, robots: false },
    '/messages': { ssr: false, robots: false },
    '/notifications': { ssr: false, robots: false },
    '/services': { ssr: false, robots: false },
    '/saved-providers': { ssr: false, robots: false },
    '/settings': { ssr: false, robots: false },
    '/become-a-provider': { ssr: false, robots: false },
    // Friendly short URLs for the admin-managed pages (Terms, Privacy, About, Contact).
    '/api/auth/**': { security: { rateLimiter: { tokensPerInterval: 60, interval: 300000 } } },
    '/terms': { redirect: '/legal/terms-of-service' },
    '/privacy': { redirect: '/legal/privacy-policy' },
    '/about': { redirect: '/legal/about' },
    '/contact': { redirect: '/legal/contact' },
  },

  devServer: {
    port: 3838,
  },

  // Opt in to Nuxt 4 defaults everywhere (app/ srcDir, normalized page names, etc.)
  future: {
    compatibilityVersion: 4,
  },

  experimental: {
    defaults: {
      nuxtLink: { prefetch: true, prefetchOn: { visibility: true } },
      useAsyncData: { deep: true },
    },
  },
  compatibilityDate: '2025-07-15',

  vite: {
    plugins: [tailwindcss()],
  },

  typescript: {
    strict: true,
    typeCheck: false,
    tsConfig: {
      compilerOptions: {
        noUncheckedIndexedAccess: true,
        noImplicitOverride: true,
        noFallthroughCasesInSwitch: true,
        forceConsistentCasingInFileNames: true,
      },
    },
  },

  eslint: {
    config: {
      stylistic: true,
    },
  },

  fonts: {
    defaults: {
      weights: [400, 500, 600, 700],
    },
  },

  // --- i18n configuration ---
  i18n: {
    baseUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://162.35.24.95:3000',
    defaultLocale: 'en',
    strategy: 'prefix_except_default',
    locales: [
      { code: 'en', language: 'en-US', name: 'English', file: 'en.json', dir: 'ltr' },
    ],
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
      redirectOn: 'root',
      fallbackLocale: 'en',
    },
  },

  image: {
    quality: 80,
    format: ['avif', 'webp'],
  },

  robots: {
    blockNonSeoBots: true,
    blockAiBots: true,
  },

  // --- Security Headers (nuxt-security) ---
  // Fix for ERR_SSL_PROTOCOL_ERROR on pure HTTP IP setup:
  // 1. upgradeInsecureRequests false kora hoyeche jate HTTP request HTTPS-e convert na hoy.
  // 2. strictTransportSecurity (HSTS) disable kora hoyeche.
  // 3. crossOriginOpenerPolicy false kora hoyeche IP origin warning bondho korte.
  security: {
    csrf: true,
    // The defaults (150 / 5 min / IP) are within reach of one idle messages tab (thread poll every 10 s, inbox
    // and badges every 30 s) and shared NATs. Generous globally; login/register/OTP are throttled by Laravel
    // per account/IP and get a tighter cap on /api/auth/** below.
    rateLimiter: {
      tokensPerInterval: 600,
      interval: 300000,
    },
    corsHandler: {
      origin: process.env.NUXT_PUBLIC_SITE_URL || 'http://162.35.24.95:3000',
    },
    headers: {
      strictTransportSecurity: false,
      crossOriginOpenerPolicy: false,
      contentSecurityPolicy: {
        'upgrade-insecure-requests': false,
        'img-src': ['\'self\'', 'data:', 'blob:', 'http:', 'https:'],
        'media-src': ['\'self\'', 'blob:', 'http:', 'https:'],
      },
    },
  },

  seo: {
    automaticTwitterTags: false,
  },
})
