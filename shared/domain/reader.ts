import { z } from 'zod'
import type { MangaId, MangaOrigin } from './manga'

export const CHAPTER_ID_PATTERN = /^[a-z0-9-]{1,40}~[a-z0-9-]{1,80}$/

export interface ContentLicense {
  readonly name: string
  readonly url: string | null
  readonly rightsHolder: string
}

export interface Chapter {
  readonly id: string
  readonly mangaId: MangaId
  readonly number: number
  readonly title: string | null
  readonly pageCount: number
  readonly publishedAt: string | null
  readonly sourceName: string
  readonly license: ContentLicense
}

export interface ChapterPage {
  readonly index: number
  readonly url: string
  readonly width: number
  readonly height: number
}

export interface ChapterList {
  readonly chapters: readonly Chapter[]
}

export interface ReadableChapter {
  readonly chapter: Chapter
  readonly pages: readonly ChapterPage[]
  readonly previous: Chapter | null
  readonly next: Chapter | null
}

export const READER_MODES = ['paged', 'vertical'] as const
export type ReaderMode = (typeof READER_MODES)[number]

export const READING_DIRECTIONS = ['rtl', 'ltr'] as const
export type ReadingDirection = (typeof READING_DIRECTIONS)[number]

export const PAGE_FITS = ['height', 'width'] as const
export type PageFit = (typeof PAGE_FITS)[number]

export interface ReaderPreferences {
  readonly mode: ReaderMode | 'auto'
  readonly direction: ReadingDirection | 'auto'
  readonly fit: PageFit
}

export const DEFAULT_READER_PREFERENCES: ReaderPreferences = { mode: 'auto', direction: 'auto', fit: 'height' }

export const readerPreferencesSchema = z.object({
  mode: z.enum([...READER_MODES, 'auto']),
  direction: z.enum([...READING_DIRECTIONS, 'auto']),
  fit: z.enum(PAGE_FITS),
})

export interface ResolvedReaderSettings {
  readonly mode: ReaderMode
  readonly direction: ReadingDirection
  readonly fit: PageFit
}

export function resolveReaderSettings(preferences: ReaderPreferences, origin: MangaOrigin): ResolvedReaderSettings {
  const isScrollingComic = origin === 'KR' || origin === 'CN' || origin === 'TW'
  return {
    mode: preferences.mode === 'auto' ? (isScrollingComic ? 'vertical' : 'paged') : preferences.mode,
    direction: preferences.direction === 'auto' ? (origin === 'JP' ? 'rtl' : 'ltr') : preferences.direction,
    fit: preferences.fit,
  }
}

export function chapterLabel(chapter: Pick<Chapter, 'number' | 'title'>): string {
  const number = `Chapter ${formatChapterNumber(chapter.number)}`
  return chapter.title ? `${number} — ${chapter.title}` : number
}

export function formatChapterNumber(number: number): string {
  return Number.isInteger(number) ? String(number) : number.toFixed(1)
}

export function adjacentChapters(chapters: readonly Chapter[], currentId: string): { previous: Chapter | null; next: Chapter | null } {
  const ordered = [...chapters].sort((a, b) => a.number - b.number)
  const index = ordered.findIndex(chapter => chapter.id === currentId)
  if (index === -1) return { previous: null, next: null }
  return { previous: ordered[index - 1] ?? null, next: ordered[index + 1] ?? null }
}

export function clampPage(page: number, pageCount: number): number {
  if (pageCount <= 0) return 0
  return Math.min(pageCount - 1, Math.max(0, Math.trunc(page)))
}

export function isLastPage(page: number, pageCount: number): boolean {
  return pageCount > 0 && page >= pageCount - 1
}

export const READING_POSITIONS_SCHEMA_VERSION = 1
export const READING_POSITIONS_CAPACITY = 300

export interface ReadingPosition {
  readonly chapterId: string
  readonly chapterNumber: number
  readonly page: number
  readonly pageCount: number
  readonly updatedAt: string
}

export interface ReadingPositions {
  readonly version: typeof READING_POSITIONS_SCHEMA_VERSION
  readonly entries: Readonly<Record<MangaId, ReadingPosition>>
}

export function emptyReadingPositions(): ReadingPositions {
  return { version: READING_POSITIONS_SCHEMA_VERSION, entries: {} }
}

export function savePosition(positions: ReadingPositions, mangaId: MangaId, position: ReadingPosition): ReadingPositions {
  const current = positions.entries[mangaId]
  if (current && current.chapterId === position.chapterId && current.page === position.page) return positions
  const others = Object.entries(positions.entries)
    .filter(([id]) => id !== mangaId)
    .sort(([, a], [, b]) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, READING_POSITIONS_CAPACITY - 1)
  return { ...positions, entries: Object.fromEntries([[mangaId, position], ...others]) }
}

export function resumePage(positions: ReadingPositions, mangaId: MangaId, chapterId: string, pageCount: number): number {
  const position = positions.entries[mangaId]
  if (!position || position.chapterId !== chapterId || isLastPage(position.page, pageCount)) return 0
  return clampPage(position.page, pageCount)
}
