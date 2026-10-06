import { isDomainError } from '#shared/domain/errors'
import {
  emptyLibrary,
  getEntry,
  mergeLibraries,
  recordChapterRead,
  readingStatusLabel,
  recordProgress,
  refreshSnapshot,
  removeEntry,
  setFavorite,
  setPreferredPlatform,
  setStatus,
  type Library,
  type MangaSnapshot,
  type PreferredPlatform,
  type ReadingStatus,
} from '#shared/domain/library'
import type { MangaId } from '#shared/domain/manga'
import { libraryStore } from '~/infrastructure/storage/stores'

export const LIBRARY_STATE_KEY = 'library'
export const LIBRARY_READY_KEY = 'library-ready'

export function useLibrary() {
  const { state: library, commit, ensureHydrated } = usePersistedState<Library>(LIBRARY_STATE_KEY, libraryStore, emptyLibrary, 'bibliothèque')
  const ready = useState(LIBRARY_READY_KEY, () => false)
  const toast = useToast()

  const now = () => new Date().toISOString()

  function apply(operation: (current: Library) => Library, feedback?: string): boolean {
    ensureHydrated()
    let next: Library
    try {
      next = operation(library.value)
    } catch (error) {
      toast.push(isDomainError(error) ? error.message : 'Cette modification n’a pas pu être appliquée.', { tone: 'error' })
      return false
    }
    const saved = commit(next)
    if (saved && feedback) toast.push(feedback)
    return saved
  }

  return {
    hydrate: ensureHydrated,
    library: readonly(library),
    ready: readonly(ready),
    entryOf: (mangaId: MaybeRefOrGetter<MangaId>) => computed(() => getEntry(library.value, toValue(mangaId))),
    setStatus: (manga: MangaSnapshot, status: ReadingStatus) => {
      ensureHydrated()
      const isNew = !getEntry(library.value, manga.id)
      const saved = apply(current => setStatus(current, manga, status, now()), `${manga.title} → ${readingStatusLabel(status)}`)
      if (saved && isNew) trackEvent('library_add', { status, manga: manga.title })
      return saved
    },
    toggleFavorite: (manga: MangaSnapshot) => {
      ensureHydrated()
      const favorite = !getEntry(library.value, manga.id)?.favorite
      const saved = apply(current => setFavorite(current, manga, favorite, now()), favorite ? `${manga.title} ajouté aux favoris` : `Retiré des favoris`)
      if (saved) trackEvent('favorite', { enabled: favorite, manga: manga.title })
      return saved
    },
    markChapterRead: (manga: MangaSnapshot, chapterNumber: number) => apply(current => recordChapterRead(current, manga, chapterNumber, now())),
    setProgress: (mangaId: MangaId, chapter: number) => apply(current => recordProgress(current, mangaId, chapter, now())),
    rememberPlatform: (mangaId: MangaId, platform: PreferredPlatform) => apply(current => setPreferredPlatform(current, mangaId, platform, now())),
    refresh: (manga: MangaSnapshot) => apply(current => refreshSnapshot(current, manga)),
    importLibrary: (incoming: Library) => {
      ensureHydrated()
      const { library: merged, added, updated } = mergeLibraries(library.value, incoming)
      const saved = commit(merged)
      if (saved) toast.push(`Import terminé : ${added} nouveau(x) titre(s), ${updated} mis à jour`)
      return saved
    },
    remove: (mangaId: MangaId) => {
      ensureHydrated()
      const previous = library.value
      const title = getEntry(previous, mangaId)?.manga.title ?? 'Le titre'
      const removed = apply(current => removeEntry(current, mangaId))
      if (removed) toast.push(`${title} a été retiré de votre bibliothèque`, { action: { label: 'Annuler', run: () => commit(previous) } })
      return removed
    },
  }
}
