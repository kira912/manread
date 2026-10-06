import { recordSearchTerm } from '#shared/domain/history'
import { searchHistoryStore } from '~/infrastructure/storage/stores'

export const SEARCH_HISTORY_STATE_KEY = 'search-history'

export function useSearchHistory() {
  const { state: terms, commit, update, ensureHydrated } = usePersistedState<string[]>(SEARCH_HISTORY_STATE_KEY, searchHistoryStore, () => [], 'recherches')

  return {
    hydrate: ensureHydrated,
    terms: readonly(terms),
    record: (term: string) => update(current => recordSearchTerm(current, term)),
    clear: () => commit([]),
  }
}
