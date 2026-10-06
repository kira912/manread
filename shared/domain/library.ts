import { LibraryInvariantError } from './errors'
import type { MangaId, MangaOrigin, MangaStatus, MangaSummary } from './manga'

export const READING_STATUSES = ['reading', 'completed', 'plan_to_read', 'on_hold', 'dropped'] as const
export type ReadingStatus = (typeof READING_STATUSES)[number]

export const LIBRARY_SORTS = ['updated', 'added', 'title', 'progress'] as const
export type LibrarySort = (typeof LIBRARY_SORTS)[number]

export type LibraryView = ReadingStatus | 'all' | 'favorites'

export const LIBRARY_SCHEMA_VERSION = 1

export interface MangaSnapshot {
  readonly id: MangaId
  readonly slug: string
  readonly title: string
  readonly coverMedium: string
  readonly coverLarge: string
  readonly dominantColor: string | null
  readonly origin: MangaOrigin
  readonly status: MangaStatus
  readonly chapters: number | null
}

export interface PreferredPlatform {
  readonly id: string
  readonly name: string
  readonly url: string
}

export interface LibraryEntry {
  readonly manga: MangaSnapshot
  readonly status: ReadingStatus
  readonly favorite: boolean
  readonly chapter: number
  readonly preferredPlatform: PreferredPlatform | null
  readonly addedAt: string
  readonly updatedAt: string
}

export interface Library {
  readonly version: typeof LIBRARY_SCHEMA_VERSION
  readonly entries: Readonly<Record<MangaId, LibraryEntry>>
}

export interface LibraryQuery {
  readonly view: LibraryView
  readonly text: string
  readonly sort: LibrarySort
}

export type LibraryStats = Readonly<Record<LibraryView, number>>

const STATUS_LABELS: Record<ReadingStatus, string> = {
  reading: 'Reading',
  completed: 'Completed',
  plan_to_read: 'Plan to read',
  on_hold: 'On hold',
  dropped: 'Dropped',
}

export function readingStatusLabel(status: ReadingStatus): string {
  return STATUS_LABELS[status]
}

export function isReadingStatus(value: unknown): value is ReadingStatus {
  return typeof value === 'string' && (READING_STATUSES as readonly string[]).includes(value)
}

export function emptyLibrary(): Library {
  return { version: LIBRARY_SCHEMA_VERSION, entries: {} }
}

export function toSnapshot(manga: MangaSummary): MangaSnapshot {
  return {
    id: manga.id,
    slug: manga.slug,
    title: manga.title,
    coverMedium: manga.cover.medium,
    coverLarge: manga.cover.large,
    dominantColor: manga.cover.dominantColor,
    origin: manga.origin,
    status: manga.status,
    chapters: manga.chapters,
  }
}

export function getEntry(library: Library, mangaId: MangaId): LibraryEntry | undefined {
  return library.entries[mangaId]
}

export function setStatus(library: Library, manga: MangaSnapshot, status: ReadingStatus, now: string): Library {
  const existing = getEntry(library, manga.id)
  const base = existing ? { ...existing, manga } : createEntry(manga, now)
  const chapter = status === 'completed' && manga.chapters !== null ? manga.chapters : base.chapter
  return withEntry(library, { ...base, status, chapter, updatedAt: now })
}

export function setFavorite(library: Library, manga: MangaSnapshot, favorite: boolean, now: string): Library {
  const existing = getEntry(library, manga.id)
  const base = existing ? { ...existing, manga } : createEntry(manga, now)
  return withEntry(library, { ...base, favorite, updatedAt: now })
}

export function recordProgress(library: Library, mangaId: MangaId, chapter: number, now: string): Library {
  const entry = requireEntry(library, mangaId)
  assertValidChapter(chapter, entry.manga.chapters)
  return withEntry(library, {
    ...entry,
    chapter,
    status: inferStatusFromProgress(entry, chapter),
    updatedAt: now,
  })
}

export function recordChapterRead(library: Library, manga: MangaSnapshot, chapterNumber: number, now: string): Library {
  const existing = getEntry(library, manga.id)
  const base = existing ? { ...existing, manga } : { ...createEntry(manga, now), status: 'reading' as const }
  const read = Math.floor(chapterNumber)
  const capped = manga.chapters !== null ? Math.min(read, manga.chapters) : read
  if (existing && capped <= existing.chapter) return library
  return withEntry(library, { ...base, chapter: capped, status: inferStatusFromProgress(base, capped), updatedAt: now })
}

export function setPreferredPlatform(library: Library, mangaId: MangaId, platform: PreferredPlatform, now: string): Library {
  const entry = getEntry(library, mangaId)
  if (!entry || (entry.preferredPlatform?.id === platform.id && entry.preferredPlatform.url === platform.url)) return library
  return withEntry(library, { ...entry, preferredPlatform: platform, updatedAt: now })
}

export function removeEntry(library: Library, mangaId: MangaId): Library {
  if (!getEntry(library, mangaId)) return library
  const { [mangaId]: _removed, ...entries } = library.entries
  return { ...library, entries }
}

export function refreshSnapshot(library: Library, manga: MangaSnapshot): Library {
  const entry = getEntry(library, manga.id)
  if (!entry || snapshotsEqual(entry.manga, manga)) return library
  return withEntry(library, { ...entry, manga })
}

export function mergeLibraries(current: Library, incoming: Library): { library: Library; added: number; updated: number } {
  const entries = { ...current.entries }
  let added = 0
  let updated = 0
  for (const entry of Object.values(incoming.entries)) {
    const existing = entries[entry.manga.id]
    if (!existing) {
      added += 1
      entries[entry.manga.id] = entry
    } else if (entry.updatedAt > existing.updatedAt) {
      updated += 1
      entries[entry.manga.id] = entry
    }
  }
  return { library: { ...current, entries }, added, updated }
}

export function queryLibrary(library: Library, query: LibraryQuery): LibraryEntry[] {
  const needle = query.text.trim().toLowerCase()
  return Object.values(library.entries)
    .filter(entry => matchesView(entry, query.view))
    .filter(entry => !needle || entry.manga.title.toLowerCase().includes(needle))
    .sort(LIBRARY_COMPARATORS[query.sort])
}

export function continueReading(library: Library, limit: number): LibraryEntry[] {
  return queryLibrary(library, { view: 'reading', text: '', sort: 'updated' }).slice(0, limit)
}

export function recommendationSeed(library: Library): LibraryEntry | undefined {
  const candidates = Object.values(library.entries).filter(
    entry => entry.favorite || entry.status === 'completed' || entry.status === 'reading',
  )
  return candidates.sort((a, b) => Number(b.favorite) - Number(a.favorite) || b.updatedAt.localeCompare(a.updatedAt))[0]
}

export function libraryStats(library: Library): LibraryStats {
  const entries = Object.values(library.entries)
  const counts = Object.fromEntries(READING_STATUSES.map(status => [status, 0])) as Record<ReadingStatus, number>
  for (const entry of entries) counts[entry.status] += 1
  return { ...counts, all: entries.length, favorites: entries.filter(entry => entry.favorite).length }
}

export function progressRatio(entry: LibraryEntry): number | null {
  if (entry.manga.chapters === null || entry.manga.chapters === 0) return null
  return Math.min(1, entry.chapter / entry.manga.chapters)
}

const LIBRARY_COMPARATORS: Record<LibrarySort, (a: LibraryEntry, b: LibraryEntry) => number> = {
  updated: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
  added: (a, b) => b.addedAt.localeCompare(a.addedAt),
  title: (a, b) => a.manga.title.localeCompare(b.manga.title, 'en', { sensitivity: 'base' }),
  progress: (a, b) => (progressRatio(b) ?? -1) - (progressRatio(a) ?? -1) || b.chapter - a.chapter,
}

function matchesView(entry: LibraryEntry, view: LibraryView): boolean {
  if (view === 'all') return true
  if (view === 'favorites') return entry.favorite
  return entry.status === view
}

function createEntry(manga: MangaSnapshot, now: string): LibraryEntry {
  return {
    manga,
    status: 'plan_to_read',
    favorite: false,
    chapter: 0,
    preferredPlatform: null,
    addedAt: now,
    updatedAt: now,
  }
}

function withEntry(library: Library, entry: LibraryEntry): Library {
  return { ...library, entries: { ...library.entries, [entry.manga.id]: entry } }
}

function requireEntry(library: Library, mangaId: MangaId): LibraryEntry {
  const entry = getEntry(library, mangaId)
  if (!entry) throw new LibraryInvariantError(`Manga "${mangaId}" is not in the library`)
  return entry
}

function assertValidChapter(chapter: number, totalChapters: number | null): void {
  if (!Number.isInteger(chapter) || chapter < 0) {
    throw new LibraryInvariantError('Chapter must be a non-negative integer')
  }
  if (totalChapters !== null && chapter > totalChapters) {
    throw new LibraryInvariantError(`Chapter cannot exceed ${totalChapters}`)
  }
}

function inferStatusFromProgress(entry: LibraryEntry, chapter: number): ReadingStatus {
  const { chapters, status: publicationStatus } = entry.manga
  if (chapters !== null && chapter === chapters && publicationStatus === 'finished') return 'completed'
  if (entry.status === 'completed') return chapters !== null && chapter < chapters ? 'reading' : 'completed'
  if (chapter > 0 && (entry.status === 'plan_to_read' || entry.status === 'on_hold')) return 'reading'
  return entry.status
}

function snapshotsEqual(a: MangaSnapshot, b: MangaSnapshot): boolean {
  return (Object.keys(a) as (keyof MangaSnapshot)[]).every(key => a[key] === b[key])
}
