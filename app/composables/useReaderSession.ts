import { toSnapshot } from '#shared/domain/library'
import type { MangaSummary } from '#shared/domain/manga'
import { clampPage, isLastPage, resolveReaderSettings, resumePage, type ReadableChapter } from '#shared/domain/reader'

const PRELOAD_AHEAD = 2
const SAVE_DEBOUNCE_MS = 400

export function useReaderSession(readable: Ref<ReadableChapter>, manga: Ref<MangaSummary>) {
  const { preferences, set: setPreferences } = useReaderPreferences()
  const { positions, save, hydrate: hydratePositions } = useReadingPositions()
  const { markChapterRead } = useLibrary()
  const libraryReady = useState(LIBRARY_READY_KEY, () => false)

  const settings = computed(() => resolveReaderSettings(preferences.value, manga.value.origin))
  const pageCount = computed(() => readable.value.pages.length)
  const page = ref(0)
  const finished = ref(false)
  const resumedFrom = ref<number | null>(null)
  let chapterRecorded = false
  let saveTimer: ReturnType<typeof setTimeout> | undefined

  const chapter = computed(() => readable.value.chapter)

  function persistPosition() {
    clearTimeout(saveTimer)
    save(manga.value.id, {
      chapterId: chapter.value.id,
      chapterNumber: chapter.value.number,
      page: page.value,
      pageCount: pageCount.value,
      updatedAt: new Date().toISOString(),
    })
  }

  function goTo(target: number) {
    finished.value = false
    page.value = clampPage(target, pageCount.value)
  }

  function next() {
    if (isLastPage(page.value, pageCount.value)) {
      finished.value = true
      return
    }
    goTo(page.value + 1)
  }

  function previous() {
    if (finished.value) {
      finished.value = false
      return
    }
    goTo(page.value - 1)
  }

  watch(
    libraryReady,
    ready => {
      if (!ready || resumedFrom.value !== null) return
      hydratePositions()
      const start = resumePage(positions.value, manga.value.id, chapter.value.id, pageCount.value)
      resumedFrom.value = start
      page.value = start
      markChapterRead(toSnapshot(manga.value), chapter.value.number - 1)
      trackEvent('reader_open', { manga: manga.value.title, chapter: chapter.value.number })
    },
    { immediate: true },
  )

  watch(page, current => {
    if (import.meta.server || resumedFrom.value === null) return
    clearTimeout(saveTimer)
    saveTimer = setTimeout(persistPosition, SAVE_DEBOUNCE_MS)

    if (!chapterRecorded && isLastPage(current, pageCount.value)) {
      chapterRecorded = true
      markChapterRead(toSnapshot(manga.value), chapter.value.number)
      trackEvent('chapter_complete', { manga: manga.value.title, chapter: chapter.value.number })
    }

    for (let offset = 1; offset <= PRELOAD_AHEAD; offset += 1) {
      const upcoming = readable.value.pages[current + offset]
      if (upcoming) new Image().src = upcoming.url
    }
  })

  const onVisibilityChange = () => {
    if (document.visibilityState === 'hidden' && resumedFrom.value !== null) persistPosition()
  }
  onMounted(() => document.addEventListener('visibilitychange', onVisibilityChange))
  onBeforeUnmount(() => {
    document.removeEventListener('visibilitychange', onVisibilityChange)
    if (resumedFrom.value !== null) persistPosition()
  })

  return { settings, setPreferences, preferences, page, pageCount, finished, resumedFrom, goTo, next, previous }
}
