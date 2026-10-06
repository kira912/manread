import { describe, expect, it, vi } from 'vitest'
import { NotFoundError, ProviderUnavailableError } from '#shared/domain/errors'
import { EMPTY_SEARCH_QUERY } from '#shared/domain/search'
import type { CatalogContext } from '../../../server/application/context'
import { getHomeFeed } from '../../../server/application/get-home-feed'
import { getMangaDetails } from '../../../server/application/get-manga-details'
import type { AvailabilityProvider, CatalogProvider } from '../../../server/application/ports'
import { instantSearch, searchManga } from '../../../server/application/search-manga'
import { FixtureCatalogProvider } from '../../../server/infrastructure/providers/fixture/fixture-provider'
import { buildAvailability, buildManga, buildSummary } from '../../support/builders'
import { passthroughCache, RecordingMetrics, silentLogger } from '../../support/fakes'

function context(catalog: Partial<CatalogProvider> | CatalogProvider, availabilityProviders: AvailabilityProvider[] = []): CatalogContext {
  return {
    catalog: 'id' in catalog ? (catalog as CatalogProvider) : ({ id: 'test', ...catalog } as CatalogProvider),
    availabilityProviders,
    chapterSources: [],
    cache: passthroughCache,
    logger: silentLogger,
    metrics: new RecordingMetrics(),
    editorialPicks: [{ mangaId: '1', note: 'Great.' }],
  }
}

const failingProvider: AvailabilityProvider = { id: 'down', getAvailability: () => Promise.reject(new ProviderUnavailableError('down', 'timeout')) }
const workingProvider = (id: string, offers = [buildAvailability()]): AvailabilityProvider => ({ id, getAvailability: async () => offers })

describe('getMangaDetails', () => {
  it('aggregates availability and isolates failing providers', async () => {
    const ctx = context({ getManga: async () => buildManga() }, [workingProvider('a'), failingProvider, workingProvider('b')])
    const details = await getMangaDetails(ctx, '1')
    expect(details.availability).toHaveLength(1)
    expect(details.availabilityDegraded).toBe(true)
  })

  it('throws a domain NotFoundError for unknown titles', async () => {
    await expect(getMangaDetails(context({ getManga: async () => null }), '9')).rejects.toBeInstanceOf(NotFoundError)
  })
})

describe('getHomeFeed', () => {
  it('builds sections, picks and a hero with availability', async () => {
    const trending = [buildSummary({ id: '1' }), buildSummary({ id: '2' })]
    const ctx = context(
      {
        getDiscovery: async () => ({ trending }),
        getMangaBatch: async () => [buildSummary({ id: '1' })],
        getManga: async id => buildManga({ id, synopsis: ['Hero synopsis'] }),
      },
      [workingProvider('a')],
    )
    const feed = await getHomeFeed(ctx)
    expect(feed.hero).toMatchObject({ manga: { id: '1' }, synopsis: ['Hero synopsis'], platforms: [{ id: 'manga-plus', name: 'MANGA Plus' }] })
    expect(feed.editorsPicks).toEqual([{ manga: expect.objectContaining({ id: '1' }), note: 'Great.' }])
  })

  it('degrades gracefully when picks and hero details fail', async () => {
    const ctx = context({
      getDiscovery: async () => ({ trending: [buildSummary({ id: '7' })] }),
      getMangaBatch: () => Promise.reject(new Error('down')),
      getManga: () => Promise.reject(new Error('down')),
    })
    const feed = await getHomeFeed(ctx)
    expect(feed.editorsPicks).toEqual([])
    expect(feed.hero).toMatchObject({ manga: { id: '7' }, synopsis: [], platforms: [] })
  })

  it('fails when discovery itself is unavailable so stale cache can be served', async () => {
    const ctx = context({ getDiscovery: () => Promise.reject(new ProviderUnavailableError('test', 'down')), getMangaBatch: async () => [] })
    await expect(getHomeFeed(ctx)).rejects.toBeInstanceOf(ProviderUnavailableError)
  })
})

describe('search use cases', () => {
  it('skips the provider for too-short instant queries', async () => {
    const instant = vi.fn()
    await expect(instantSearch(context({ instantSearch: instant }), ' a ')).resolves.toEqual({ manga: [], creators: [] })
    expect(instant).not.toHaveBeenCalled()
  })

  it('normalises whitespace before searching', async () => {
    const instant = vi.fn().mockResolvedValue({ manga: [], creators: [] })
    await instantSearch(context({ instantSearch: instant }), '  one   piece ')
    expect(instant).toHaveBeenCalledWith('one piece', expect.any(Object))
  })

  it('searches the offline fixture catalog end to end', async () => {
    const fixture = new FixtureCatalogProvider()
    const ctx = context(fixture, [fixture])
    const page = await searchManga(ctx, { ...EMPTY_SEARCH_QUERY, genres: ['Drama'], readableOnly: true, sort: 'score' })
    expect(page.items.length).toBeGreaterThan(0)
    expect(page.items.every(item => item.genres.includes('Drama'))).toBe(true)
    expect(page.items.map(item => item.score)).toEqual([...page.items.map(item => item.score)].sort((a, b) => (b ?? 0) - (a ?? 0)))
  })
})
