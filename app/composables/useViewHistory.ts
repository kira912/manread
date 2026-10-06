import { emptyViewHistory, forgetView, recordView, type ViewHistory } from '#shared/domain/history'
import type { MangaSnapshot } from '#shared/domain/library'
import type { MangaId } from '#shared/domain/manga'
import { viewHistoryStore } from '~/infrastructure/storage/stores'

export const VIEW_HISTORY_STATE_KEY = 'view-history'

export function useViewHistory() {
  const { state: history, commit, update, ensureHydrated } = usePersistedState<ViewHistory>(VIEW_HISTORY_STATE_KEY, viewHistoryStore, emptyViewHistory, 'history')

  return {
    hydrate: ensureHydrated,
    history: readonly(history),
    record: (manga: MangaSnapshot) => update(current => recordView(current, manga, new Date().toISOString())),
    forget: (mangaId: MangaId) => update(current => forgetView(current, mangaId)),
    clear: () => commit(emptyViewHistory()),
  }
}
