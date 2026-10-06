import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from 'web-vitals'

const MAX_ERROR_REPORTS = 5
const ERROR_MESSAGE_LIMIT = 500
const STACK_LIMIT = 2_000

export default defineNuxtPlugin({
  name: 'telemetry',
  parallel: true,
  setup(nuxtApp) {
    const router = useRouter()
    const sampleRate = Number(useRuntimeConfig().public.telemetrySampleRate)
    const sampled = Math.random() < sampleRate
    let errorReports = 0

    const routeName = () => String(router.currentRoute.value.name ?? 'unknown').replace(/[^\w-]/g, '-').slice(0, 80) || 'unknown'

    const send = (path: string, payload: Record<string, unknown>) => {
      const body = new Blob([JSON.stringify(payload)], { type: 'application/json' })
      if (!navigator.sendBeacon(path, body)) {
        void fetch(path, { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'application/json' } }).catch(
          (error: unknown) => console.warn('[telemetry] delivery failed', error),
        )
      }
    }

    const reportError = (kind: string, error: unknown) => {
      if (errorReports >= MAX_ERROR_REPORTS) return
      errorReports += 1
      const normalized = error instanceof Error ? error : new Error(String(error))
      send('/api/telemetry/errors', {
        kind,
        message: normalized.message.slice(0, ERROR_MESSAGE_LIMIT),
        stack: normalized.stack?.slice(0, STACK_LIMIT),
        route: routeName(),
      })
    }

    nuxtApp.hook('vue:error', error => reportError('vue', error))
    window.addEventListener('error', event => reportError('window', event.error ?? event.message))
    window.addEventListener('unhandledrejection', event => reportError('unhandledrejection', event.reason))

    if (!sampled) return
    const reportVital = (metric: Metric) =>
      send('/api/telemetry/vitals', { name: metric.name, value: metric.value, rating: metric.rating, route: routeName() })
    onLCP(reportVital)
    onINP(reportVital)
    onCLS(reportVital)
    onFCP(reportVital)
    onTTFB(reportVital)
  },
})
