import { consentStatus, emptyConsent, recordConsent, type AnalyticsConsent, type ConsentChoice } from '#shared/domain/consent'
import { parseMeasurementId } from '~/infrastructure/analytics/google-analytics'
import { consentStore } from '~/infrastructure/storage/stores'

export function useAnalyticsConsent() {
  const measurementId = parseMeasurementId(useRuntimeConfig().public.gaMeasurementId)
  const { state, commit, ensureHydrated } = usePersistedState<AnalyticsConsent>('analytics-consent', consentStore, emptyConsent, 'choix de cookies')
  const settingsOpen = useState('consent-settings-open', () => false)
  const status = computed(() => consentStatus(state.value, new Date()))

  function decide(choice: ConsentChoice) {
    if (commit(recordConsent(choice, new Date().toISOString()))) settingsOpen.value = false
  }

  return {
    measurementId,
    hydrate: ensureHydrated,
    status,
    promptVisible: computed(() => measurementId !== null && (status.value === 'pending' || settingsOpen.value)),
    accept: () => decide('granted'),
    refuse: () => decide('denied'),
    openSettings: () => {
      settingsOpen.value = true
    },
  }
}
