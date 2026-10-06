import { z } from 'zod'
import { CONSENT_CHOICES, CONSENT_SCHEMA_VERSION } from '#shared/domain/consent'
import { HISTORY_SCHEMA_VERSION, SEARCH_HISTORY_CAPACITY, VIEW_HISTORY_CAPACITY } from '#shared/domain/history'
import { LIBRARY_SCHEMA_VERSION, READING_STATUSES } from '#shared/domain/library'
import { MANGA_ORIGINS, MANGA_STATUSES } from '#shared/domain/manga'
import { CHAPTER_ID_PATTERN, READING_POSITIONS_CAPACITY, READING_POSITIONS_SCHEMA_VERSION, readerPreferencesSchema } from '#shared/domain/reader'

const MAX_LIBRARY_ENTRIES = 5_000
const isoDate = z.string().datetime()
const safeImageUrl = z.string().max(4096).refine(value => value.startsWith('https://') || value.startsWith('/') || value.startsWith('data:image/svg+xml'))

export const mangaSnapshotSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,40}$/),
  slug: z.string().max(100),
  title: z.string().max(300),
  coverMedium: safeImageUrl,
  coverLarge: safeImageUrl,
  dominantColor: z.string().regex(/^#[0-9a-f]{6}$/i).nullable(),
  origin: z.enum(MANGA_ORIGINS),
  status: z.enum(MANGA_STATUSES),
  chapters: z.number().int().nonnegative().nullable(),
})

export const libraryEntrySchema = z.object({
  manga: mangaSnapshotSchema,
  status: z.enum(READING_STATUSES),
  favorite: z.boolean(),
  chapter: z.number().int().nonnegative(),
  preferredPlatform: z
    .object({ id: z.string().max(80), name: z.string().max(120), url: z.string().url().startsWith('https://') })
    .nullable(),
  addedAt: isoDate,
  updatedAt: isoDate,
})

export const librarySchema = z.object({
  version: z.literal(LIBRARY_SCHEMA_VERSION),
  entries: z.record(z.string(), libraryEntrySchema).refine(entries => Object.keys(entries).length <= MAX_LIBRARY_ENTRIES),
})

export const viewHistorySchema = z.object({
  version: z.literal(HISTORY_SCHEMA_VERSION),
  entries: z.array(z.object({ manga: mangaSnapshotSchema, viewedAt: isoDate })).max(VIEW_HISTORY_CAPACITY),
})

export const searchHistorySchema = z.array(z.string().max(100)).max(SEARCH_HISTORY_CAPACITY)

export const readingPositionsSchema = z.object({
  version: z.literal(READING_POSITIONS_SCHEMA_VERSION),
  entries: z
    .record(
      z.string().regex(/^[a-z0-9-]{1,40}$/),
      z.object({
        chapterId: z.string().regex(CHAPTER_ID_PATTERN),
        chapterNumber: z.number().positive(),
        page: z.number().int().nonnegative(),
        pageCount: z.number().int().positive(),
        updatedAt: isoDate,
      }),
    )
    .refine(entries => Object.keys(entries).length <= READING_POSITIONS_CAPACITY),
})

export const consentSchema = z.object({
  version: z.literal(CONSENT_SCHEMA_VERSION),
  choice: z.enum(CONSENT_CHOICES).nullable(),
  decidedAt: isoDate.nullable(),
})

export { readerPreferencesSchema }
