import { inject as injectVercelAnalytics } from '@vercel/analytics'
import { injectSpeedInsights } from '@vercel/speed-insights'
import { disableGoogleAnalytics, enableGoogleAnalytics, sendGoogleAnalyticsPageView } from '~/infrastructure/analytics/google-analytics'

const UMAMI_SCRIPT = 'https://cloud.umami.is/script.js'

export default defineNuxtPlugin({
  name: 'analytics',
  parallel: true,
  setup(nuxtApp) {
    const config = useRuntimeConfig().public

    if (config.vercelInsights) {
      injectVercelAnalytics({ mode: 'production' })
      injectSpeedInsights()
    }

    const websiteId = String(config.umamiWebsiteId ?? '')
    if (/^[0-9a-f-]{36}$/i.test(websiteId)) {
      const script = document.createElement('script')
      script.src = UMAMI_SCRIPT
      script.defer = true
      script.dataset.websiteId = websiteId
      script.dataset.doNotTrack = 'true'
      script.dataset.excludeSearch = 'false'
      script.referrerPolicy = 'strict-origin-when-cross-origin'
      document.head.append(script)
    }

    const consent = useAnalyticsConsent()
    const measurementId = consent.measurementId
    if (!measurementId) return

    onNuxtReady(() => {
      consent.hydrate()
      watch(
        consent.status,
        status => {
          if (status !== 'granted') return disableGoogleAnalytics(measurementId)
          enableGoogleAnalytics(measurementId)
          sendGoogleAnalyticsPageView()
        },
        { immediate: true },
      )
    })

    nuxtApp.hook('page:finish', () => {
      // unhead flushes the new <title> in a zero-delay timeout queued during render: wait for it.
      if (consent.status.value === 'granted') setTimeout(sendGoogleAnalyticsPageView, 0)
    })
  },
})
