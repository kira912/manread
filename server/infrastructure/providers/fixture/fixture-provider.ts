import type { Availability, Platform } from '#shared/domain/availability'
import type { CreatorProfile } from '#shared/domain/creator'
import type { DiscoverySection } from '#shared/domain/discovery'
import type { Manga, MangaId, MangaSummary } from '#shared/domain/manga'
import { EMPTY_SEARCH_QUERY, type Page, type SearchQuery } from '#shared/domain/search'
import type { AvailabilityProvider, CatalogProvider, InstantSearchResult } from '../../../application/ports'
import { buildFixtureCatalog, buildFixtureCreators, FIXTURE_PROVIDER_ID, type FixtureEntry } from './dataset'

const PAGE_SIZE = 24

type Comparator = (a: MangaSummary, b: MangaSummary) => number

const SORTS: Record<SearchQuery['sort'], Comparator> = {
  relevance: (a, b) => b.popularity - a.popularity,
  popularity: (a, b) => b.popularity - a.popularity,
  score: (a, b) => (b.score ?? 0) - (a.score ?? 0),
  trending: (a, b) => b.favourites - a.favourites,
  newest: (a, b) => (b.startYear ?? 0) - (a.startYear ?? 0),
  title: (a, b) => a.title.localeCompare(b.title),
}

const DISCOVERY: Record<DiscoverySection, (entries: readonly Manga[]) => Manga[]> = {
  trending: entries => entries.toSorted(SORTS.popularity),
  newReleases: entries => entries.filter(manga => manga.status === 'releasing').toSorted(SORTS.newest),
  hiddenGems: entries => entries.filter(manga => manga.popularity < 40_000).toSorted(SORTS.score),
  mostFollowed: entries => entries.toSorted((a, b) => b.favourites - a.favourites),
  recentlyAdded: entries => entries.toSorted((a, b) => Number(b.id) - Number(a.id)),
}

export class FixtureCatalogProvider implements CatalogProvider, AvailabilityProvider {
  readonly id = FIXTURE_PROVIDER_ID
  private readonly entries: readonly FixtureEntry[]
  private readonly creators: readonly CreatorProfile[]

  constructor() {
    this.entries = buildFixtureCatalog()
    this.creators = buildFixtureCreators(this.entries)
  }

  async search(query: SearchQuery): Promise<Page<MangaSummary>> {
    const needle = query.text.toLowerCase()
    const matches = this.entries
      .filter(entry => !needle || [entry.manga.title, ...entry.manga.alternativeTitles].some(title => title.toLowerCase().includes(needle)))
      .filter(entry => query.genres.every(genre => entry.manga.genres.includes(genre)))
      .filter(entry => !query.status || entry.manga.status === query.status)
      .filter(entry => !query.origin || entry.manga.origin === query.origin)
      .filter(entry => query.yearFrom === null || (entry.manga.startYear ?? 0) >= query.yearFrom)
      .filter(entry => query.yearTo === null || (entry.manga.startYear ?? 0) <= query.yearTo)
      .filter(entry => matchesAvailability(entry.availability, query))
      .map(entry => entry.manga)
      .sort(SORTS[query.sort])

    const start = (query.page - 1) * PAGE_SIZE
    return {
      items: matches.slice(start, start + PAGE_SIZE),
      page: query.page,
      hasNextPage: start + PAGE_SIZE < matches.length,
      total: matches.length,
    }
  }

  async instantSearch(text: string, limits: { manga: number; creators: number }): Promise<InstantSearchResult> {
    const needle = text.toLowerCase()
    const page = await this.search({ ...EMPTY_SEARCH_QUERY, text })
    return {
      manga: page.items.slice(0, limits.manga),
      creators: this.creators.filter(creator => creator.name.toLowerCase().includes(needle)).slice(0, limits.creators),
    }
  }

  async getManga(id: MangaId): Promise<Manga | null> {
    return this.find(id)?.manga ?? null
  }

  async getMangaBatch(ids: readonly MangaId[]): Promise<MangaSummary[]> {
    return ids.map(id => this.find(id)?.manga).filter((manga): manga is Manga => manga !== undefined)
  }

  async getRecommendations(id: MangaId, limit: number): Promise<MangaSummary[]> {
    const source = this.find(id)?.manga
    if (!source) return []
    return this.entries
      .map(entry => entry.manga)
      .filter(manga => manga.id !== id)
      .map(manga => ({ manga, overlap: manga.genres.filter(genre => source.genres.includes(genre)).length }))
      .filter(candidate => candidate.overlap > 0)
      .sort((a, b) => b.overlap - a.overlap || b.manga.popularity - a.manga.popularity)
      .slice(0, limit)
      .map(candidate => candidate.manga)
  }

  async getDiscovery(sections: readonly DiscoverySection[], limit: number): Promise<Partial<Record<DiscoverySection, MangaSummary[]>>> {
    const all = this.entries.map(entry => entry.manga)
    return Object.fromEntries(sections.map(section => [section, DISCOVERY[section](all).slice(0, limit)]))
  }

  async getCreator(id: string): Promise<CreatorProfile | null> {
    return this.creators.find(creator => creator.id === id) ?? null
  }

  async listGenres(): Promise<string[]> {
    return [...new Set(this.entries.flatMap(entry => entry.manga.genres))].sort()
  }

  async listPlatforms(): Promise<Platform[]> {
    const platforms = new Map<string, { name: string; languages: Set<string> }>()
    for (const offer of this.entries.flatMap(entry => entry.availability)) {
      const platform = platforms.get(offer.platformId) ?? { name: offer.platformName, languages: new Set<string>() }
      if (offer.language) platform.languages.add(offer.language)
      platforms.set(offer.platformId, platform)
    }
    return [...platforms.entries()].map(([id, platform]) => ({ id, name: platform.name, languages: [...platform.languages].sort() }))
  }

  async listIndexableManga(limit: number): Promise<Pick<MangaSummary, 'id' | 'slug'>[]> {
    return this.entries.slice(0, limit).map(entry => ({ id: entry.manga.id, slug: entry.manga.slug }))
  }

  async getAvailability(manga: Pick<Manga, 'id'>): Promise<Availability[]> {
    return [...(this.find(manga.id)?.availability ?? [])]
  }

  private find(id: MangaId): FixtureEntry | undefined {
    return this.entries.find(entry => entry.manga.id === id)
  }
}

function matchesAvailability(availability: readonly Availability[], query: SearchQuery): boolean {
  if (!query.readableOnly && query.platformIds.length === 0 && query.languages.length === 0) return true
  return availability.some(
    offer =>
      (query.platformIds.length === 0 || query.platformIds.includes(offer.platformId)) &&
      (query.languages.length === 0 || (offer.language !== null && query.languages.includes(offer.language))),
  )
}
