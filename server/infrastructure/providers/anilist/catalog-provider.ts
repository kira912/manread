import { z } from 'zod'
import type { Platform } from '#shared/domain/availability'
import type { CreatorProfile } from '#shared/domain/creator'
import type { DiscoverySection } from '#shared/domain/discovery'
import type { Manga, MangaId, MangaStatus, MangaSummary } from '#shared/domain/manga'
import { slugify } from '#shared/domain/slug'
import type { Page, SearchQuery, SearchSort } from '#shared/domain/search'
import type { CatalogProvider, InstantSearchResult } from '../../../application/ports'
import type { AniListGateway } from './gateway'
import { ANILIST_PROVIDER_ID, mapCreator, mapCreatorSearchResults, mapMediaDetail, mapSummaries, mapSummary, pickTitle } from './mapper'
import {
  buildDiscoveryQuery,
  CREATOR_QUERY,
  GENRES_QUERY,
  INDEXABLE_QUERY,
  INSTANT_SEARCH_QUERY,
  MEDIA_BATCH_QUERY,
  RECOMMENDATIONS_QUERY,
  SEARCH_QUERY,
} from './queries'
import {
  creatorResponseSchema,
  genresResponseSchema,
  indexableResponseSchema,
  instantSearchResponseSchema,
  mediaListResponseSchema,
  recommendationsResponseSchema,
  searchResponseSchema,
} from './schemas'

export const SEARCH_PAGE_SIZE = 24
const MAX_BATCH_SIZE = 50
const INDEXABLE_PAGE_SIZE = 50
const NEW_RELEASE_WINDOW_YEARS = 2
const HIDDEN_GEM_ROTATION_PAGES = 4
const ANILIST_ID = /^[1-9]\d{0,8}$/

const STATUS_TO_ANILIST: Record<MangaStatus, string> = {
  releasing: 'RELEASING',
  finished: 'FINISHED',
  hiatus: 'HIATUS',
  cancelled: 'CANCELLED',
  upcoming: 'NOT_YET_RELEASED',
}

const SORT_TO_ANILIST: Record<Exclude<SearchSort, 'relevance'>, string[]> = {
  popularity: ['POPULARITY_DESC'],
  score: ['SCORE_DESC', 'POPULARITY_DESC'],
  trending: ['TRENDING_DESC', 'POPULARITY_DESC'],
  newest: ['START_DATE_DESC', 'POPULARITY_DESC'],
  title: ['TITLE_ROMAJI'],
}

export interface AniListCatalogOptions {
  readonly gateway: AniListGateway
  readonly now?: () => Date
}

export class AniListCatalogProvider implements CatalogProvider {
  readonly id = ANILIST_PROVIDER_ID
  private readonly gateway: AniListGateway
  private readonly now: () => Date

  constructor(options: AniListCatalogOptions) {
    this.gateway = options.gateway
    this.now = options.now ?? (() => new Date())
  }

  async search(query: SearchQuery): Promise<Page<MangaSummary>> {
    const licensedBy = await this.resolveLicensedBy(query)
    if (licensedBy !== undefined && licensedBy.length === 0) return { items: [], page: query.page, hasNextPage: false, total: 0 }

    const data = await this.gateway.query('Search', SEARCH_QUERY, buildSearchVariables(query, licensedBy), searchResponseSchema)
    if (!data) return { items: [], page: query.page, hasNextPage: false, total: 0 }
    return {
      items: mapSummaries(data.Page.media, this.gateway),
      page: query.page,
      hasNextPage: data.Page.pageInfo.hasNextPage ?? false,
      total: data.Page.pageInfo.total,
    }
  }

  async instantSearch(text: string, limits: { manga: number; creators: number }): Promise<InstantSearchResult> {
    const data = await this.gateway.query(
      'InstantSearch',
      INSTANT_SEARCH_QUERY,
      { search: text, mangaLimit: limits.manga, creatorLimit: limits.creators },
      instantSearchResponseSchema,
    )
    if (!data) return { manga: [], creators: [] }
    return {
      manga: mapSummaries(data.manga.media as unknown[], this.gateway),
      creators: mapCreatorSearchResults(data.creators.staff as unknown[], this.gateway),
    }
  }

  async getManga(id: MangaId): Promise<Manga | null> {
    const numericId = parseAniListId(id)
    if (numericId === null) return null
    const raw = await this.gateway.loadMediaDetail(numericId)
    return raw ? (mapMediaDetail(raw, this.gateway)?.manga ?? null) : null
  }

  async getMangaBatch(ids: readonly MangaId[]): Promise<MangaSummary[]> {
    const numericIds = ids.map(parseAniListId).filter((id): id is number => id !== null).slice(0, MAX_BATCH_SIZE)
    if (numericIds.length === 0) return []
    const data = await this.gateway.query('MediaBatch', MEDIA_BATCH_QUERY, { ids: numericIds, perPage: numericIds.length }, mediaListResponseSchema)
    const byId = new Map(mapSummaries((data?.Page.media ?? []) as unknown[], this.gateway).map(manga => [manga.id, manga]))
    return ids.map(id => byId.get(id)).filter((manga): manga is MangaSummary => manga !== undefined)
  }

  async getRecommendations(id: MangaId, limit: number): Promise<MangaSummary[]> {
    const numericId = parseAniListId(id)
    if (numericId === null) return []
    const data = await this.gateway.query('Recommendations', RECOMMENDATIONS_QUERY, { id: numericId, perPage: limit }, recommendationsResponseSchema)
    const nodes = data?.Media?.recommendations.nodes ?? []
    return nodes
      .map(node => node.mediaRecommendation as { type?: unknown } | null)
      .filter(media => media?.type === 'MANGA')
      .map(media => mapSummary(media, this.gateway))
      .filter((manga): manga is MangaSummary => manga !== null && manga.id !== id)
  }

  async getDiscovery(sections: readonly DiscoverySection[], limit: number): Promise<Partial<Record<DiscoverySection, MangaSummary[]>>> {
    if (sections.length === 0) return {}
    const now = this.now()
    const variables = {
      perPage: limit,
      recentSince: (now.getUTCFullYear() - NEW_RELEASE_WINDOW_YEARS) * 10_000,
      rotationPage: (dayOfYear(now) % HIDDEN_GEM_ROTATION_PAGES) + 1,
    }
    const data = await this.gateway.query('Discovery', buildDiscoveryQuery(sections), variables, discoveryResponseSchema(sections))
    const result: Partial<Record<DiscoverySection, MangaSummary[]>> = {}
    for (const section of sections) {
      result[section] = mapSummaries(data?.[section]?.media ?? [], this.gateway)
    }
    return result
  }

  async getCreator(id: string): Promise<CreatorProfile | null> {
    const numericId = parseAniListId(id)
    if (numericId === null) return null
    const data = await this.gateway.query('Creator', CREATOR_QUERY, { id: numericId }, creatorResponseSchema)
    return data?.Staff ? mapCreator(data.Staff, this.gateway) : null
  }

  async listGenres(): Promise<string[]> {
    const data = await this.gateway.query('Genres', GENRES_QUERY, {}, genresResponseSchema)
    return (data?.GenreCollection ?? []).filter(genre => genre !== 'Hentai').sort()
  }

  async listPlatforms(): Promise<Platform[]> {
    const directory = await this.gateway.loadPlatformDirectory()
    return [...directory.platforms]
  }

  async listIndexableManga(limit: number): Promise<Pick<MangaSummary, 'id' | 'slug'>[]> {
    const pages = Math.ceil(limit / INDEXABLE_PAGE_SIZE)
    const entries: Pick<MangaSummary, 'id' | 'slug'>[] = []
    for (let page = 1; page <= pages; page += 1) {
      const data = await this.gateway.query('Indexable', INDEXABLE_QUERY, { page, perPage: INDEXABLE_PAGE_SIZE }, indexableResponseSchema)
      for (const media of data?.Page.media ?? []) {
        if (media.isAdult) continue
        entries.push({ id: String(media.id), slug: slugify(media.title.english ?? media.title.romaji ?? pickTitle(media.title)) })
      }
      if (!data?.Page.pageInfo.hasNextPage) break
    }
    return entries.slice(0, limit)
  }

  private async resolveLicensedBy(query: SearchQuery): Promise<number[] | undefined> {
    const filtersPlatforms = query.platformIds.length > 0 || query.languages.length > 0
    if (!filtersPlatforms && !query.readableOnly) return undefined
    const directory = await this.gateway.loadPlatformDirectory()
    return directory.siteIds({ platformIds: query.platformIds, languages: query.languages })
  }
}

export function buildSearchVariables(query: SearchQuery, licensedBy: readonly number[] | undefined): Record<string, unknown> {
  return compact({
    page: query.page,
    perPage: SEARCH_PAGE_SIZE,
    search: query.text || undefined,
    genres: query.genres.length ? query.genres : undefined,
    status: query.status ? STATUS_TO_ANILIST[query.status] : undefined,
    country: query.origin ?? undefined,
    startAfter: query.yearFrom !== null ? query.yearFrom * 10_000 : undefined,
    startBefore: query.yearTo !== null ? (query.yearTo + 1) * 10_000 : undefined,
    licensedBy,
    sort: resolveSort(query),
  })
}

function resolveSort(query: SearchQuery): string[] {
  if (query.sort === 'relevance') return query.text ? ['SEARCH_MATCH', 'POPULARITY_DESC'] : SORT_TO_ANILIST.popularity
  return SORT_TO_ANILIST[query.sort]
}

function discoveryResponseSchema(sections: readonly DiscoverySection[]) {
  const sectionSchema = z.object({ media: z.array(z.unknown()).nullable() })
  return z.object(Object.fromEntries(sections.map(section => [section, sectionSchema])) as Record<DiscoverySection, typeof sectionSchema>)
}

function parseAniListId(id: MangaId): number | null {
  return ANILIST_ID.test(id) ? Number(id) : null
}

function compact(record: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined))
}

function dayOfYear(date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0)
  return Math.floor((date.getTime() - start) / 86_400_000)
}
