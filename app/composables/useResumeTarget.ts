import type { MangaId } from '#shared/domain/manga'
import { formatChapterNumber, isLastPage, type Chapter } from '#shared/domain/reader'

export interface ResumeTarget {
  readonly to: string
  readonly label: string
  readonly isContinuation: boolean
}

export function readerPath(chapter: Pick<Chapter, 'mangaId' | 'id'>): string {
  return `/read/${chapter.mangaId}/${chapter.id}`
}

export function useResumeTarget(mangaId: MaybeRefOrGetter<MangaId>, chapters: MaybeRefOrGetter<readonly Chapter[]>) {
  const { positionOf } = useReadingPositions()
  const position = positionOf(mangaId)

  return computed<ResumeTarget | null>(() => {
    const list = toValue(chapters)
    const first = list[0]
    if (!first) return null

    const saved = position.value
    const current = saved ? list.find(chapter => chapter.id === saved.chapterId) : undefined
    if (saved && current) {
      if (!isLastPage(saved.page, saved.pageCount)) {
        return { to: readerPath(current), label: `Continuer ch. ${formatChapterNumber(current.number)} · p. ${saved.page + 1}`, isContinuation: true }
      }
      const following = list.find(chapter => chapter.number > current.number)
      if (following) return { to: readerPath(following), label: `Lire le ch. ${formatChapterNumber(following.number)}`, isContinuation: true }
    }
    return { to: readerPath(first), label: `Commencer la lecture · ch. ${formatChapterNumber(first.number)}`, isContinuation: false }
  })
}
