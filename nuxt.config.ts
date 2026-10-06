import { fileURLToPath } from 'node:url'
import { COVER_RENDER_WIDTHS } from './shared/domain/manga'

const isDev = process.env.NODE_ENV !== 'production'
const isVercel = Boolean(process.env.VERCEL)
const vercelProductionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
const umamiEnabled = Boolean(process.env.NUXT_PUBLIC_UMAMI_WEBSITE_ID)

const ANILIST_IMAGE_ORIGIN = 'https://s4.anilist.co'

export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',
  devtools: { enabled: false },
  modules: ['nuxt-security', '@nuxt/image'],
  css: ['~/assets/css/main.css'],

  typescript: {
    strict: true,
    typeCheck: false,
  },

  experimental: {
    viewTransition: true,
  },

  features: {
    inlineStyles: true,
  },

  image: {
    provider: isVercel ? 'vercel' : 'ipx',
    domains: ['s4.anilist.co'],
    screens: Object.fromEntries(COVER_RENDER_WIDTHS.map(width => [`cover${width}`, width])),
    vercel: { minimumCacheTTL: 2_592_000, formats: ['image/avif', 'image/webp'] },
    quality: 72,
    format: ['webp'],
    ...(isVercel ? {} : { ipx: { maxAge: 31_536_000 } }),
  },

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      titleTemplate: '%s · Manread',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'theme-color', content: '#07070a' },
        { name: 'color-scheme', content: 'dark' },
        { name: 'format-detection', content: 'telephone=no' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'preconnect', href: ANILIST_IMAGE_ORIGIN, crossorigin: '' },
        { rel: 'manifest', href: '/site.webmanifest' },
      ],
    },
  },

  runtimeConfig: {
    catalogProvider: 'anilist',
    anilistEndpoint: 'https://graphql.anilist.co',
    anilistRequestsPerMinute: 25,
    logLevel: 'info',
    metricsToken: '',
    trustProxy: isVercel,
    compressHtml: !isVercel,
    apiRequestsPerMinute: 180,
    public: {
      siteUrl: vercelProductionUrl ? `https://${vercelProductionUrl}` : 'http://localhost:3000',
      siteName: 'Manread',
      telemetrySampleRate: isVercel ? 0 : 1,
      vercelInsights: isVercel,
      umamiWebsiteId: '',
      googleSiteVerification: '',
      bingSiteVerification: '',
    },
  },

  routeRules: {
    '/library': { ssr: false },
    '/content/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
    '/api/telemetry/**': {
      security: {
        requestSizeLimiter: { maxRequestSizeInBytes: 8_000, maxUploadFileRequestInBytes: 0 },
      },
    },
  },

  security: {
    nonce: true,
    strict: false,
    headers: {
      crossOriginEmbedderPolicy: 'unsafe-none',
      crossOriginResourcePolicy: 'same-origin',
      referrerPolicy: 'strict-origin-when-cross-origin',
      xFrameOptions: 'DENY',
      permissionsPolicy: {
        camera: [],
        microphone: [],
        geolocation: [],
        'display-capture': [],
        fullscreen: ['self'],
      },
      strictTransportSecurity: isDev ? false : { maxAge: 31_536_000, includeSubdomains: true, preload: true },
      contentSecurityPolicy: {
        'default-src': ["'self'"],
        'base-uri': ["'none'"],
        'object-src': ["'none'"],
        'frame-ancestors': ["'none'"],
        'form-action': ["'self'"],
        'script-src': ["'self'", "'nonce-{{nonce}}'", "'strict-dynamic'"],
        'script-src-attr': ["'none'"],
        'style-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", 'data:', ANILIST_IMAGE_ORIGIN],
        'font-src': ["'self'"],
        'connect-src': [
          "'self'",
          ...(isDev ? ['ws:', 'wss:'] : []),
          ...(umamiEnabled ? ['https://gateway.umami.is', 'https://cloud.umami.is'] : []),
        ],
        'manifest-src': ["'self'"],
        'worker-src': ["'none'"],
        'upgrade-insecure-requests': !isDev,
      },
    },
    rateLimiter: false,
    requestSizeLimiter: {
      maxRequestSizeInBytes: 32_000,
      maxUploadFileRequestInBytes: 0,
    },
    xssValidator: { methods: ['GET', 'POST'] },
    corsHandler: false,
    hidePoweredBy: true,
    removeLoggers: false,
  },

  nitro: {
    compressPublicAssets: { gzip: true, brotli: true },
    serverAssets: [{ baseName: 'content', dir: fileURLToPath(new URL('./content', import.meta.url)) }],
    vercel: { functions: { runtime: 'nodejs24.x' } },
  },
})
