import type { BrowserStore } from '~/infrastructure/storage/browser-store'

const hydratedKeys = new Set<string>()

export function usePersistedState<T>(stateKey: string, store: BrowserStore<T>, fallback: () => T, label: string) {
  const state = useState<T>(stateKey, fallback)
  const toast = useToast()

  function ensureHydrated() {
    if (import.meta.server || hydratedKeys.has(stateKey)) return
    hydratedKeys.add(stateKey)
    const outcome = store.load()
    state.value = outcome.value
    if (outcome.status === 'recovered') {
      toast.push(`Vos données (${label}) étaient illisibles et ont été réinitialisées. Une copie de sauvegarde a été conservée sur cet appareil.`, { tone: 'error', durationMs: 8_000 })
    }
    store.subscribe(value => {
      state.value = value
    })
  }

  function commit(next: T): boolean {
    ensureHydrated()
    const previous = state.value
    if (Object.is(previous, next)) return true
    state.value = next
    try {
      store.save(next)
      return true
    } catch (error) {
      state.value = previous
      toast.push('Impossible d’enregistrer sur cet appareil : le stockage du navigateur est plein ou bloqué.', { tone: 'error' })
      return false
    }
  }

  function update(operation: (current: T) => T): boolean {
    ensureHydrated()
    return commit(operation(state.value))
  }

  return { state, commit, update, ensureHydrated }
}
