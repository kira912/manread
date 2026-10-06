import { z } from 'zod'

export const CONTENT_MANIFEST_FILE = 'manifest.json'
export const CONTENT_MANIFEST_VERSION = 1
export const SOURCE_ID_PATTERN = /^[a-z0-9-]{1,40}$/
export const CONTENT_SLUG_PATTERN = /^[a-z0-9-]{1,80}$/
export const PAGE_FILE_PATTERN = /^\d{3,4}-[a-f0-9]{8}\.(webp|png|jpe?g|avif)$/

export const PAGE_CONTENT_TYPES: Readonly<Record<string, string>> = {
  webp: 'image/webp',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  avif: 'image/avif',
}

const MAX_PAGE_DIMENSION = 20_000

const pageSchema = z.object({
  file: z.string().regex(PAGE_FILE_PATTERN),
  width: z.number().int().positive().max(MAX_PAGE_DIMENSION),
  height: z.number().int().positive().max(MAX_PAGE_DIMENSION),
})

const chapterSchema = z.object({
  id: z.string().regex(CONTENT_SLUG_PATTERN),
  number: z.number().positive().max(100_000),
  title: z.string().trim().min(1).max(200).nullable(),
  publishedAt: z.iso.date().nullable(),
  pages: z.array(pageSchema).min(1).max(2_000),
})

const seriesSchema = z.object({
  catalog: z.object({ provider: z.string().regex(SOURCE_ID_PATTERN), id: z.string().regex(/^[a-z0-9-]{1,40}$/) }),
  title: z.string().trim().min(1).max(300),
  chapters: z.array(chapterSchema),
})

export const contentManifestSchema = z
  .object({
    version: z.literal(CONTENT_MANIFEST_VERSION),
    source: z.object({
      id: z.string().regex(SOURCE_ID_PATTERN),
      name: z.string().trim().min(1).max(120),
      license: z.object({
        name: z.string().trim().min(1).max(120),
        url: z.url({ protocol: /^https$/ }).nullable(),
        rightsHolder: z.string().trim().min(1).max(200),
      }),
    }),
    series: z.array(seriesSchema),
  })
  .superRefine((manifest, context) => {
    const seen = new Set<string>()
    for (const series of manifest.series) {
      for (const chapter of series.chapters) {
        if (seen.has(chapter.id)) context.addIssue({ code: 'custom', message: `Duplicate chapter id "${chapter.id}"` })
        seen.add(chapter.id)
      }
    }
  })

export type ContentManifest = z.infer<typeof contentManifestSchema>
export type ManifestSeries = ContentManifest['series'][number]
export type ManifestChapter = ManifestSeries['chapters'][number]
