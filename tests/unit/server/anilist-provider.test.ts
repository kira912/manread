import { describe, expect, it, vi } from 'vitest'
import { ProviderInvalidResponseError } from '#shared/domain/errors'
import { EMPTY_SEARCH_QUERY, parseSearchQuery } from '#shared/domain/search'
import { AniListAvailabilityProvider } from '../../../server/infrastructure/providers/anilist/availability-provider'
import { AniListCatalogProvider, buildSearchVariables } from '../../../server/infrastructure/providers/anilist/catalog-provider'
import { AniListGateway } from '../../../server/infrastructure/providers/anilist/gateway'
import { CircuitBreaker } from '../../../server/infrastructure/resilience/circuit-breaker'
import { ResilientHttpClient } from '../../../server/infrastructure/resilience/resilient-http-client'
import { TokenBucket } from '../../../server/infrastructure/resilience/token-bucket'
import { rawMedia, rawMediaDetail } from '../../support/anilist-fixtures'
import { jsonResponse, passthroughCache, RecordingMetrics, silentLogger } from '../../support/fakes'

function setup(responder: (body: { query: string; variables: Record<string, unknown> }) => Response) {
  const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => responder(JSON.parse(String(init?.body))))
  const metrics = new RecordingMetrics()
  const http = new ResilientHttpClient({
    providerId: 'anilist',
    timeoutMs: 1000,
    retries: 0,
    maxRetryDelayMs: 0,
    maxQueueWaitMs: 0,
    breaker: new CircuitBreaker({ failureThreshold: 5, cooldownMs: 1000 }),
    limiter: new TokenBucket({ capacity: 100, refillPerSecond: 100 }),
    logger: silentLogger,
    metrics,
    fetch: fetchImpl as unknown as typeof fetch,
  })
  const gateway = new AniListGateway({ endpoint: 'https://graphql.anilist.co', http, cache: passthroughCache, logger: silentLogger, metrics })
  return {
    fetchImpl,
    catalog: new AniListCatalogProvider({ gateway, now: () => new Date('2026-03-01T00:00:00Z') }),
    availability: new AniListAvailabilityProvider(gateway),
  }
}

describe('AniList catalog provider', () => {
  it('searches and maps a page of results', async () => {
    const { catalog, fetchImpl } = setup(() =>
      jsonResponse({ data: { Page: { pageInfo: { hasNextPage: true, total: 120 }, media: [rawMedia(), rawMedia({ id: 2 })] } } }),
    )
    const page = await catalog.search(parseSearchQuery({ q: 'piece' }))
    expect(page).toMatchObject({ page: 1, hasNextPage: true, total: 120 })
    expect(page.items).toHaveLength(2)
    const body = JSON.parse(String(fetchImpl.mock.calls[0]?.[1]?.body))
    expect(body.variables).toMatchObject({ search: 'piece', sort: ['SEARCH_MATCH', 'POPULARITY_DESC'] })
  })

  it('returns null for unknown or malformed ids without calling the API', async () => {
    const { catalog, fetchImpl } = setup(() => jsonResponse({ data: { Media: null }, errors: [{ message: 'Not Found.', status: 404 }] }, 404))
    await expect(catalog.getManga('abc')).resolves.toBeNull()
    expect(fetchImpl).not.toHaveBeenCalled()
    await expect(catalog.getManga('999999')).resolves.toBeNull()
  })

  it('raises an explicit error on GraphQL errors', async () => {
    const { catalog } = setup(() => jsonResponse({ data: null, errors: [{ message: 'Invalid query' }] }, 400))
    await expect(catalog.search(EMPTY_SEARCH_QUERY)).rejects.toBeInstanceOf(ProviderInvalidResponseError)
  })

  it('raises an explicit error when the payload shape changes', async () => {
    const { catalog } = setup(() => jsonResponse({ data: { Page: { unexpected: true } } }))
    await expect(catalog.search(EMPTY_SEARCH_QUERY)).rejects.toBeInstanceOf(ProviderInvalidResponseError)
  })

  it('resolves platform filters to AniList site ids', async () => {
    const { catalog, fetchImpl } = setup(({ query }) => {
      if (query.includes('ExternalLinkSourceCollection')) {
        return jsonResponse({
          data: {
            ExternalLinkSourceCollection: [
              { id: 42, site: 'MANGA Plus', language: 'English' },
              { id: 43, site: 'MANGA Plus', language: 'French' },
              { id: 37, site: 'FAKKU', language: 'English' },
            ],
          },
        })
      }
      return jsonResponse({ data: { Page: { pageInfo: { hasNextPage: false, total: 0 }, media: [] } } })
    })
    await catalog.search(parseSearchQuery({ platform: 'manga-plus', lang: 'French' }))
    const searchBody = JSON.parse(String(fetchImpl.mock.calls[1]?.[1]?.body))
    expect(searchBody.variables.licensedBy).toEqual([43])
    await expect(catalog.listPlatforms()).resolves.toEqual([{ id: 'manga-plus', name: 'MANGA Plus', languages: ['English', 'French'] }])
  })

  it('short-circuits searches for platforms that do not exist', async () => {
    const { catalog, fetchImpl } = setup(() => jsonResponse({ data: { ExternalLinkSourceCollection: [] } }))
    await expect(catalog.search(parseSearchQuery({ platform: 'unknown' }))).resolves.toMatchObject({ items: [], total: 0 })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('builds discovery sections from a single request', async () => {
    const { catalog, fetchImpl } = setup(() =>
      jsonResponse({ data: { trending: { media: [rawMedia()] }, hiddenGems: { media: [rawMedia({ id: 5 })] } } }),
    )
    const result = await catalog.getDiscovery(['trending', 'hiddenGems'], 6)
    expect(result.trending?.[0]?.id).toBe('30013')
    expect(result.hiddenGems?.[0]?.id).toBe('5')
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('preserves the configured order of a batch', async () => {
    const { catalog } = setup(() => jsonResponse({ data: { Page: { media: [rawMedia({ id: 1 }), rawMedia({ id: 2 })] } } }))
    const items = await catalog.getMangaBatch(['2', '1', 'bad'])
    expect(items.map(item => item.id)).toEqual(['2', '1'])
  })

  it('exposes only safe streaming links as availability', async () => {
    const { availability } = setup(() => jsonResponse({ data: { Media: rawMediaDetail() } }))
    const offers = await availability.getAvailability({ id: '30013' })
    expect(offers.map(offer => offer.url)).toEqual(['https://mangaplus.shueisha.co.jp/titles/100020'])
  })
})

describe('buildSearchVariables', () => {
  it('maps the domain query to AniList variables', () => {
    const query = parseSearchQuery({ status: 'upcoming', origin: 'KR', from: '2000', to: '2010', genre: 'Drama', sort: 'score', page: '3' })
    expect(buildSearchVariables(query, [1, 2])).toEqual({
      page: 3,
      perPage: 24,
      genres: ['Drama'],
      status: 'NOT_YET_RELEASED',
      country: 'KR',
      startAfter: 20_000_000,
      startBefore: 20_110_000,
      licensedBy: [1, 2],
      sort: ['SCORE_DESC', 'POPULARITY_DESC'],
    })
  })
})
