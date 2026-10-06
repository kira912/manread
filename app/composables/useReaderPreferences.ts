import { DEFAULT_READER_PREFERENCES, type ReaderPreferences } from '#shared/domain/reader'
import { readerPreferencesStore } from '~/infrastructure/storage/stores'

export function useReaderPreferences() {
  const { state: preferences, update, ensureHydrated } = usePersistedState<ReaderPreferences>(
    'reader-preferences',
    readerPreferencesStore,
    () => ({ ...DEFAULT_READER_PREFERENCES }),
    'préférences du lecteur',
  )

  return {
    hydrate: ensureHydrated,
    preferences: readonly(preferences),
    set: (patch: Partial<ReaderPreferences>) => update(current => ({ ...current, ...patch })),
  }
}
