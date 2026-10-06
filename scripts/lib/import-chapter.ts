import { createHash } from 'node:crypto'
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'
import sharp from 'sharp'
import {
  CONTENT_MANIFEST_FILE,
  CONTENT_MANIFEST_VERSION,
  contentManifestSchema,
  type ContentManifest,
} from '../../server/infrastructure/content/manifest.ts'

const SOURCE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif', '.tif', '.tiff'])
const MAX_PAGE_WIDTH = 1600
const WEBP_QUALITY = 82
const HASH_LENGTH = 8

export interface ImportChapterInput {
  readonly contentDir: string
  readonly publicDir: string
  readonly source: { readonly id: string; readonly name: string }
  readonly license: { readonly name: string; readonly url: string | null; readonly rightsHolder: string }
  readonly catalog: { readonly provider: string; readonly id: string }
  readonly seriesTitle: string
  readonly chapter: { readonly number: number; readonly title: string | null; readonly publishedAt: string | null }
  readonly pages: readonly string[]
}

export interface ImportChapterResult {
  readonly chapterId: string
  readonly pageCount: number
  readonly bytes: number
}

export async function importChapter(input: ImportChapterInput): Promise<ImportChapterResult> {
  const sourceDir = resolve(input.contentDir, input.source.id)
  const manifestPath = join(sourceDir, CONTENT_MANIFEST_FILE)
  const manifest = await readManifest(manifestPath, input)
  assertSameLicense(manifest, input)

  const chapterKey = `${slugify(input.seriesTitle)}-c${String(input.chapter.number).replace('.', '-')}`
  const chapterDir = resolve(input.publicDir, input.source.id, chapterKey)
  const sources = await expandSources(input.pages)
  if (sources.length === 0) throw new Error('No page images found (png, jpg, webp, avif, tiff).')

  await rm(chapterDir, { recursive: true, force: true })
  await mkdir(chapterDir, { recursive: true })

  let bytes = 0
  const pages = []
  for (const [index, sourcePath] of sources.entries()) {
    const { data, info } = await sharp(sourcePath)
      .rotate()
      .resize({ width: MAX_PAGE_WIDTH, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer({ resolveWithObject: true })
    const hash = createHash('sha256').update(data).digest('hex').slice(0, HASH_LENGTH)
    const file = `${String(index + 1).padStart(3, '0')}-${hash}.webp`
    await writeFile(join(chapterDir, file), data)
    bytes += data.length
    pages.push({ file, width: info.width, height: info.height })
  }

  const chapterEntry = { id: chapterKey, number: input.chapter.number, title: input.chapter.title, publishedAt: input.chapter.publishedAt, pages }
  const series = manifest.series.find(entry => entry.catalog.provider === input.catalog.provider && entry.catalog.id === input.catalog.id)
  const nextSeries = series
    ? manifest.series.map(entry =>
        entry === series
          ? { ...entry, chapters: [...entry.chapters.filter(chapter => chapter.id !== chapterKey), chapterEntry].sort((a, b) => a.number - b.number) }
          : entry,
      )
    : [...manifest.series, { catalog: { ...input.catalog }, title: input.seriesTitle, chapters: [chapterEntry] }]

  const next = contentManifestSchema.parse({ ...manifest, series: nextSeries })
  const temporaryPath = `${manifestPath}.tmp`
  await mkdir(sourceDir, { recursive: true })
  await writeFile(temporaryPath, `${JSON.stringify(next, null, 2)}\n`)
  await rename(temporaryPath, manifestPath)

  return { chapterId: `${input.source.id}~${chapterKey}`, pageCount: pages.length, bytes }
}

async function readManifest(path: string, input: ImportChapterInput): Promise<ContentManifest> {
  const raw = await readFile(path, 'utf8').catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return null
    throw error
  })
  if (raw === null) {
    return {
      version: CONTENT_MANIFEST_VERSION,
      source: { id: input.source.id, name: input.source.name, license: { ...input.license } },
      series: [],
    }
  }
  return contentManifestSchema.parse(JSON.parse(raw))
}

function assertSameLicense(manifest: ContentManifest, input: ImportChapterInput): void {
  const current = manifest.source.license
  if (current.name !== input.license.name || current.rightsHolder !== input.license.rightsHolder) {
    throw new Error(
      `Source "${manifest.source.id}" is registered under "${current.name}" (${current.rightsHolder}). ` +
        'Use a separate --source for content under a different license.',
    )
  }
}

async function expandSources(paths: readonly string[]): Promise<string[]> {
  const files: string[] = []
  for (const path of paths) {
    const info = await stat(path)
    if (info.isDirectory()) {
      const entries = await readdir(path)
      files.push(...entries.map(entry => join(path, entry)).filter(isImage))
    } else if (isImage(path)) {
      files.push(path)
    }
  }
  return files.sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))
}

function isImage(path: string): boolean {
  return SOURCE_EXTENSIONS.has(extname(path).toLowerCase())
}

function slugify(input: string): string {
  return (
    input
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50) || 'series'
  )
}
