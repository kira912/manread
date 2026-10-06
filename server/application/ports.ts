import type { Availability, Platform } from '#shared/domain/availability'
import type { CreatorProfile, CreatorSummary } from '#shared/domain/creator'
import type { DiscoverySection } from '#shared/domain/discovery'
import type { Manga, MangaId, MangaSummary } from '#shared/domain/manga'
import type { Chapter, ChapterPage } from '#shared/domain/reader'
import type { Page, SearchQuery } from '#shared/domain/search'

export interface CatalogProvider {
  readonly id: string
  search(query: SearchQuery): Promise<Page<MangaSummary>>
  instantSearch(text: string, limits: { manga: number; creators: number }): Promise<InstantSearchResult>
  getManga(id: MangaId): Promise<Manga | null>
  getMangaBatch(ids: readonly MangaId[]): Promise<MangaSummary[]>
  getRecommendations(id: MangaId, limit: number): Promise<MangaSummary[]>
  getDiscovery(sections: readonly DiscoverySection[], limit: number): Promise<Partial<Record<DiscoverySection, MangaSummary[]>>>
  getCreator(id: string): Promise<CreatorProfile | null>
  listGenres(): Promise<string[]>
  listPlatforms(): Promise<Platform[]>
  listIndexableManga(limit: number): Promise<Pick<MangaSummary, 'id' | 'slug'>[]>
}

export interface AvailabilityProvider {
  readonly id: string
  getAvailability(manga: Pick<Manga, 'id' | 'title' | 'alternativeTitles'>): Promise<Availability[]>
}

export interface ChapterSource {
  readonly id: string
  listChapters(mangaId: MangaId): Promise<Chapter[]>
  getChapter(chapterId: string): Promise<{ chapter: Chapter; pages: ChapterPage[] } | null>
}

export interface InstantSearchResult {
  readonly manga: readonly MangaSummary[]
  readonly creators: readonly CreatorSummary[]
}

export interface CachePolicy {
  readonly freshMs: number
  readonly staleMs: number
}

export interface Cache {
  getOrLoad<T>(key: string, policy: CachePolicy, loader: () => Promise<T>): Promise<T>
  invalidate(keyPrefix: string): number
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'
export type LogFields = Readonly<Record<string, unknown>>

export interface Logger {
  debug(message: string, fields?: LogFields): void
  info(message: string, fields?: LogFields): void
  warn(message: string, fields?: LogFields): void
  error(message: string, fields?: LogFields): void
  child(fields: LogFields): Logger
}

export interface Metrics {
  increment(name: string, labels?: Readonly<Record<string, string>>): void
  observe(name: string, valueMs: number, labels?: Readonly<Record<string, string>>): void
}
