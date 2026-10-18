import tailwindcss from '@tailwindcss/vite'
import { INTERNAL_RATE_LIMIT_KEY, RATE_LIMIT_KEY_HEADER } from './server/utils/clientIp'

// Every deployed environment (staging, production) must set this explicitly — see the
// production guard below. The `http://localhost:3838` fallback only exists so `npm run dev`
// works out of the box on a fresh checkout; it must never reach a real deployment.
if (!process.env.NUXT_PUBLIC_SITE_URL && process.env.NODE_ENV === 'production') {
  throw new Error('NUXT_PUBLIC_SITE_URL must be set in production (site URL, CORS origin and i18n base URL all depend on it).')
}
const siteUrl = process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3838'

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

  // The favicon links live in `app.vue`: an admin-uploaded favicon replaces the built-in brand mark there instead of
  // being added next to it. The apple-touch-icon stays static.
  app: {
    head: {
      link: [
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
      ],
      meta: [
        { name: 'google-site-verification', content: 'xuFUaAXacWGSPyCCczJuFOUmW2qxBiLHcUrrua-NM4s' },
      ],
    },
  },

  css: ['~/assets/css/main.css'],

  // --- SEO (@nuxtjs/seo: site-config, robots, sitemap, og-image, schema-org, seo-utils) ---
  site: {
    url: siteUrl,
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
    // Social login: the public client IDs (the secrets live only in Laravel's .env). A provider
    // with an empty ID is treated as not configured and its button is hidden.
    socialRedirectBase: siteUrl,
    socialGoogleClientId: process.env.NUXT_SOCIAL_GOOGLE_CLIENT_ID || '',
    socialFacebookClientId: process.env.NUXT_SOCIAL_FACEBOOK_CLIENT_ID || '',
    // Facebook Graph API version used by the login dialog (e.g. v19.0).
    socialFacebookGraphVersion: process.env.NUXT_SOCIAL_FACEBOOK_GRAPH_VERSION || 'v19.0',
    // Shared store for the rate limiter and Nitro's cache across Node processes (server/plugins/redis-storage.ts).
    // Empty keeps them in memory (local dev, single instance). Read at runtime, so set NUXT_REDIS_URL in the process env.
    redisUrl: '',
    // Socket peers whose X-Forwarded-For is believed (comma-separated). Empty = loopback only, which is nginx on the
    // same machine (deploy/nginx/profinder.conf). See server/utils/clientIp.ts.
    trustedProxies: '',
    // Nitro's cache of public Laravel answers (server/utils/publicApi.ts). NUXT_API_CACHE=false sends every call
    // straight to Laravel again, the rollback switch if a cached answer ever looks wrong.
    apiCache: true,
    // Server-Timing headers (render time, each backend call with Laravel's PHP/MySQL split) for finding what makes a
    // page slow: server/plugins/server-timing.ts. Off by default; NUXT_SERVER_TIMING=true turns it on.
    serverTiming: false,
  },

  // --- Hybrid rendering defaults; extend per-route as pages are added ---
  routeRules: {
    '/': { sitemap: { changefreq: 'daily', priority: 1.0 } },
    '/browse': { sitemap: { changefreq: 'daily', priority: 0.9 } },
    '/jobs': { sitemap: { changefreq: 'daily', priority: 0.9 } },
    '/blog': { sitemap: { changefreq: 'weekly', priority: 0.7 } },
    '/dashboard/**': { ssr: false, robots: false },
    '/dashboard': { ssr: false, robots: false },
    '/profile/**': { ssr: false, robots: false },
    '/profile': { ssr: false, robots: false },
    '/clients': { ssr: false, robots: false },
    '/purchases': { ssr: false, robots: false },
    '/messages': { ssr: false, robots: false },
    '/notifications': { ssr: false, robots: false },
    '/services': { ssr: false, robots: false },
    '/saved-providers': { ssr: false, robots: false },
    '/settings/**': { ssr: false, robots: false },
    '/settings': { ssr: false, robots: false },
    '/become-a-provider': { ssr: false, robots: false },
    '/seek-job/**': { ssr: false, robots: false },
    '/seek-job': { ssr: false, robots: false },
    '/find-jobs/**': { ssr: false, robots: false },
    '/find-jobs': { ssr: false, robots: false },
    // Credential endpoints: Laravel also throttles per account/IP, this just caps a single address hammering them.
    '/api/auth/**': { security: { rateLimiter: { tokensPerInterval: 60, interval: 300000 } } },
    // The backend's public files (admin-uploaded pictures). Images on the pages come straight from the backend's own
    // address, but the SEO module re-bases a non-https og:image address onto this site's origin, so the share image of a
    // plain-http setup would 404 without this. Harmless over https: those addresses are left alone.
    '/storage/**': { proxy: `${process.env.NUXT_API_BASE_URL || 'http://127.0.0.1:8000'}/storage/**` },
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
      // Nuxt 4's default: fetched data is a shallowRef. Deep reactivity proxied every nested object of every response
      // (SSR and hydration cost) for code that never changes fetched data in place. Replace `data.value` as a whole
      // (or copy it into a local `ref`, as ProviderReviews does) instead of mutating it.
      useAsyncData: { deep: false },
    },
  },
  compatibilityDate: '2025-07-15',

  // Ship .gz/.br next to every public asset at build time, so nginx (gzip_static/brotli_static, see
  // deploy/nginx/profinder.conf) and Nitro serve them pre-compressed instead of compressing per request.
  nitro: {
    compressPublicAssets: true,
    // satori (OG images) shapes text with harfbuzzjs, which loads hb.wasm from its own folder at runtime. The file
    // tracer can't see that read, so without this the server build lacks it and every share image that loads a
    // custom font fails with ENOENT.
    externals: {
      traceInclude: ['node_modules/harfbuzzjs/hb.wasm'],
    },
  },

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
    baseUrl: siteUrl,
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
    // Avatars, cover photos and CMS images are served from the Laravel backend's
    // own `storage/` disk (see `asset('storage/...')` on resources there), not
    // this app's origin — `@nuxt/image` refuses to optimise a remote host it
    // doesn't know about otherwise.
    domains: [
      new URL(process.env.NUXT_API_BASE_URL || 'http://127.0.0.1:8000').hostname,
      'admin.profinder.vip',
    ],
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
    // and badges every 30 s) and shared NATs, so the global cap is generous. Login/register/OTP are throttled
    // by Laravel per account/IP and get a much tighter cap on /api/auth/** (see routeRules).
    rateLimiter: {
      tokensPerInterval: 600,
      interval: 300000,
      // Keyed on the address server/plugins/client-ip.ts tagged (the real visitor behind nginx, not 127.0.0.1).
      // The in-process sub-requests a page render makes carry the white-listed key instead, so a page view costs
      // one token, not one per API call it makes.
      ipHeader: RATE_LIMIT_KEY_HEADER,
      whiteList: [INTERNAL_RATE_LIMIT_KEY],
    },
    corsHandler: {
      origin: siteUrl,
    },
    // nuxt-security caps uploads at 8 MB by default. Images may be up to 15 MB (Laravel's `media.upload_rules`, and most
    // are shrunk in the browser first, see `utils/downscaleImage.ts`); this leaves room for the multipart overhead.
    requestSizeLimiter: {
      maxUploadFileRequestInBytes: 16 * 1024 * 1024,
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

  // Provider profiles and legal pages are dynamic (not file-based routes),
  // so the sitemap can't discover them on its own — see `server/api/__sitemap__/urls.ts`.
  sitemap: {
    sources: ['/api/__sitemap__/urls'],
  },
})
