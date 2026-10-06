const GTAG_SCRIPT = 'https://www.googletagmanager.com/gtag/js'
const MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]{4,16}$/
// CNIL caps audience-measurement cookies at 13 months; gtag defaults to two years.
const COOKIE_EXPIRES_SECONDS = 13 * 30 * 24 * 60 * 60

type Gtag = (...args: unknown[]) => void

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: Gtag
    [disableFlag: `ga-disable-${string}`]: boolean | undefined
  }
}

export function parseMeasurementId(value: unknown): string | null {
  return typeof value === 'string' && MEASUREMENT_ID_PATTERN.test(value) ? value : null
}

// Only ever called after an explicit opt-in: nothing is loaded from Google before that.
export function enableGoogleAnalytics(measurementId: string): void {
  window[`ga-disable-${measurementId}`] = false
  if (window.gtag) {
    window.gtag('consent', 'update', { analytics_storage: 'granted' })
    return
  }

  const dataLayer = (window.dataLayer ??= [])
  // gtag.js only processes Arguments objects, not plain arrays.
  window.gtag = function gtag() {
    dataLayer.push(arguments)
  }
  window.gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' })
  window.gtag('js', new Date())
  window.gtag('config', measurementId, {
    send_page_view: false,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    cookie_expires: COOKIE_EXPIRES_SECONDS,
  })

  const script = document.createElement('script')
  script.src = `${GTAG_SCRIPT}?id=${encodeURIComponent(measurementId)}`
  script.async = true
  document.head.append(script)
}

export function disableGoogleAnalytics(measurementId: string): void {
  window[`ga-disable-${measurementId}`] = true
  window.gtag?.('consent', 'update', { analytics_storage: 'denied' })
  clearAnalyticsCookies()
}

export function sendGoogleAnalyticsEvent(name: string, params: Record<string, unknown>): void {
  window.gtag?.('event', name, params)
}

export function sendGoogleAnalyticsPageView(): void {
  sendGoogleAnalyticsEvent('page_view', { page_location: location.href, page_title: document.title })
}

function clearAnalyticsCookies(): void {
  const names = document.cookie
    .split(';')
    .map(cookie => cookie.split('=')[0]?.trim() ?? '')
    .filter(name => name === '_ga' || name.startsWith('_ga_'))
  if (names.length === 0) return

  // gtag writes on the widest registrable domain (".example.com"), which is not known client side: try every suffix.
  const labels = location.hostname.split('.')
  const domains = ['', ...labels.slice(0, -1).map((_, index) => `; domain=.${labels.slice(index).join('.')}`)]
  for (const name of names) {
    for (const domain of domains) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domain}`
  }
}
