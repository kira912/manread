import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { emptyConsent } from '#shared/domain/consent'
import { disableGoogleAnalytics, enableGoogleAnalytics, parseMeasurementId } from '~/infrastructure/analytics/google-analytics'

const ID = 'G-TEST1234'

function gtagCommands() {
  return (window.dataLayer ?? []).map(entry => Array.from(entry as ArrayLike<unknown>))
}

describe('google analytics', () => {
  beforeEach(() => {
    localStorage.clear()
    useState('analytics-consent').value = emptyConsent()
    useState('consent-settings-open').value = false
  })

  afterEach(() => {
    delete window.gtag
    delete window.dataLayer
    delete window[`ga-disable-${ID}`]
    document.head.querySelectorAll('script[src*="googletagmanager"]').forEach(script => script.remove())
    useRuntimeConfig().public.gaMeasurementId = ''
  })

  it('only accepts GA4 measurement IDs', () => {
    expect(parseMeasurementId(ID)).toBe(ID)
    expect(parseMeasurementId('UA-1234-1')).toBeNull()
    expect(parseMeasurementId('G-1234"><script>')).toBeNull()
    expect(parseMeasurementId(undefined)).toBeNull()
  })

  it('loads gtag once, without advertising features', () => {
    enableGoogleAnalytics(ID)
    enableGoogleAnalytics(ID)
    expect(document.head.querySelectorAll('script[src*="googletagmanager"]')).toHaveLength(1)
    expect(gtagCommands()).toContainEqual(['consent', 'default', expect.objectContaining({ analytics_storage: 'granted', ad_storage: 'denied' })])
    expect(gtagCommands()).toContainEqual(['config', ID, expect.objectContaining({ allow_google_signals: false, send_page_view: false })])
  })

  it('forwards typed product events once loaded', () => {
    enableGoogleAnalytics(ID)
    trackEvent('search', { source: 'page', term: 'berserk' })
    expect(gtagCommands()).toContainEqual(['event', 'search', { source: 'page', term: 'berserk' }])
  })

  it('stops collection and removes its cookies when consent is withdrawn', () => {
    enableGoogleAnalytics(ID)
    document.cookie = '_ga=GA1.1.123; path=/'
    document.cookie = '_ga_TEST1234=GS1.1.456; path=/'
    document.cookie = 'unrelated=1; path=/'
    disableGoogleAnalytics(ID)
    expect(window[`ga-disable-${ID}`]).toBe(true)
    expect(gtagCommands()).toContainEqual(['consent', 'update', { analytics_storage: 'denied' }])
    expect(document.cookie).not.toContain('_ga')
    expect(document.cookie).toContain('unrelated=1')
  })

  it('prompts only when configured and until a choice is made', () => {
    expect(useAnalyticsConsent().promptVisible.value).toBe(false)
    useRuntimeConfig().public.gaMeasurementId = ID
    const consent = useAnalyticsConsent()
    expect(consent.promptVisible.value).toBe(true)
    consent.accept()
    expect(consent.status.value).toBe('granted')
    expect(consent.promptVisible.value).toBe(false)
    expect(JSON.parse(localStorage.getItem('manread:analytics-consent') ?? '{}')).toMatchObject({ choice: 'granted' })
    consent.openSettings()
    expect(consent.promptVisible.value).toBe(true)
    consent.refuse()
    expect(consent.promptVisible.value).toBe(false)
  })
})
