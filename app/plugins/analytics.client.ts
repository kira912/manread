import { inject as injectVercelAnalytics } from '@vercel/analytics'
import { injectSpeedInsights } from '@vercel/speed-insights'

const UMAMI_SCRIPT = 'https://cloud.umami.is/script.js'

export default defineNuxtPlugin({
  name: 'analytics',
  parallel: true,
  setup() {
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
  },
})
