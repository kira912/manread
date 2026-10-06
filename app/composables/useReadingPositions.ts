import type { MangaId } from '#shared/domain/manga'
import { emptyReadingPositions, savePosition, type ReadingPosition, type ReadingPositions } from '#shared/domain/reader'
import { readingPositionsStore } from '~/infrastructure/storage/stores'

export const READING_POSITIONS_STATE_KEY = 'reading-positions'

export function useReadingPositions() {
  const { state: positions, update, ensureHydrated } = usePersistedState<ReadingPositions>(
    READING_POSITIONS_STATE_KEY,
    readingPositionsStore,
    emptyReadingPositions,
    'reading positions',
  )

  return {
    hydrate: ensureHydrated,
    positions: readonly(positions),
    positionOf: (mangaId: MaybeRefOrGetter<MangaId>) => computed(() => positions.value.entries[toValue(mangaId)]),
    save: (mangaId: MangaId, position: ReadingPosition) => update(current => savePosition(current, mangaId, position)),
  }
}
