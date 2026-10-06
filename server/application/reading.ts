import { NotFoundError } from '#shared/domain/errors'
import type { MangaId } from '#shared/domain/manga'
import { adjacentChapters, type Chapter, type ReadableChapter } from '#shared/domain/reader'
import { describeError, type CatalogContext } from './context'

export async function listReadableChapters(context: CatalogContext, mangaId: MangaId): Promise<Chapter[]> {
  const results = await Promise.allSettled(context.chapterSources.map(source => source.listChapters(mangaId)))
  const byNumber = new Map<number, Chapter>()

  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      const sourceId = context.chapterSources[index]?.id ?? 'unknown'
      context.metrics.increment('chapter_source_failed', { source: sourceId })
      context.logger.warn('chapter source failed', { source: sourceId, mangaId, error: describeError(result.reason) })
      return
    }
    for (const chapter of result.value) {
      if (!byNumber.has(chapter.number)) byNumber.set(chapter.number, chapter)
    }
  })

  return [...byNumber.values()].sort((a, b) => a.number - b.number)
}

export async function getReadableChapter(context: CatalogContext, chapterId: string): Promise<ReadableChapter> {
  for (const source of context.chapterSources) {
    const found = await source.getChapter(chapterId)
    if (!found) continue
    const siblings = await listReadableChapters(context, found.chapter.mangaId)
    context.metrics.increment('chapter_opened', { source: source.id })
    return { chapter: found.chapter, pages: found.pages, ...adjacentChapters(siblings, found.chapter.id) }
  }
  throw new NotFoundError('Chapter', chapterId)
}
