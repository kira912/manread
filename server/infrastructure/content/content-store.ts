import type { Chapter, ChapterPage } from '#shared/domain/reader'
import type { MangaId } from '#shared/domain/manga'
import { CACHE_POLICIES } from '../../application/cache-policies'
import type { Cache, ChapterSource, Logger, Metrics } from '../../application/ports'
import { contentManifestSchema, SOURCE_ID_PATTERN, type ContentManifest, type ManifestChapter, type ManifestSeries } from './manifest'

const CHAPTER_ID_SEPARATOR = '~'
export const CONTENT_PUBLIC_PATH = '/content'

export interface ManifestReader {
  listSourceIds(): Promise<string[]>
  readManifest(sourceId: string): Promise<unknown>
}

export interface ContentStoreOptions {
  readonly manifests: ManifestReader
  readonly catalogProviderId: string
  readonly cache: Cache
  readonly logger: Logger
  readonly metrics: Metrics
}

interface ChapterLocation {
  readonly manifest: ContentManifest
  readonly series: ManifestSeries
  readonly chapter: ManifestChapter
}

export class ContentStore implements ChapterSource {
  readonly id = 'content-store'

  constructor(private readonly options: ContentStoreOptions) {}

  async listChapters(mangaId: MangaId): Promise<Chapter[]> {
    const manifests = await this.loadManifests()
    return manifests.flatMap(manifest =>
      manifest.series
        .filter(series => this.belongsToCatalog(series) && series.catalog.id === mangaId)
        .flatMap(series => series.chapters.map(chapter => toChapter(manifest, series, chapter))),
    )
  }

  async getChapter(chapterId: string): Promise<{ chapter: Chapter; pages: ChapterPage[] } | null> {
    const location = await this.locate(chapterId)
    if (!location) return null
    const { manifest, series, chapter } = location
    return {
      chapter: toChapter(manifest, series, chapter),
      pages: chapter.pages.map((page, index) => ({
        index,
        url: `${CONTENT_PUBLIC_PATH}/${manifest.source.id}/${chapter.id}/${page.file}`,
        width: page.width,
        height: page.height,
      })),
    }
  }

  private async locate(chapterId: string): Promise<ChapterLocation | null> {
    const [sourceId, chapterKey] = chapterId.split(CHAPTER_ID_SEPARATOR)
    if (!sourceId || !chapterKey) return null
    const manifest = (await this.loadManifests()).find(candidate => candidate.source.id === sourceId)
    for (const series of manifest?.series ?? []) {
      if (!this.belongsToCatalog(series)) continue
      const chapter = series.chapters.find(candidate => candidate.id === chapterKey)
      if (manifest && chapter) return { manifest, series, chapter }
    }
    return null
  }

  private belongsToCatalog(series: ManifestSeries): boolean {
    return series.catalog.provider === this.options.catalogProviderId
  }

  private loadManifests(): Promise<ContentManifest[]> {
    return this.options.cache.getOrLoad('content:manifests', CACHE_POLICIES.contentManifests, () => this.readManifests())
  }

  private async readManifests(): Promise<ContentManifest[]> {
    const manifests: ContentManifest[] = []
    for (const sourceId of await this.options.manifests.listSourceIds()) {
      if (!SOURCE_ID_PATTERN.test(sourceId)) continue
      const parsed = contentManifestSchema.safeParse(await this.options.manifests.readManifest(sourceId))
      if (parsed.success && parsed.data.source.id === sourceId) {
        manifests.push(parsed.data)
        continue
      }
      this.options.metrics.increment('content_manifest_invalid', { source: sourceId })
      this.options.logger.error('invalid content manifest ignored', {
        source: sourceId,
        issues: parsed.success ? ['source.id must match its directory name'] : parsed.error.issues.slice(0, 5).map(issue => `${issue.path.join('.')}: ${issue.message}`),
      })
    }
    return manifests
  }
}

function toChapter(manifest: ContentManifest, series: ManifestSeries, chapter: ManifestChapter): Chapter {
  return {
    id: `${manifest.source.id}${CHAPTER_ID_SEPARATOR}${chapter.id}`,
    mangaId: series.catalog.id,
    number: chapter.number,
    title: chapter.title,
    pageCount: chapter.pages.length,
    publishedAt: chapter.publishedAt,
    sourceName: manifest.source.name,
    license: { ...manifest.source.license },
  }
}
