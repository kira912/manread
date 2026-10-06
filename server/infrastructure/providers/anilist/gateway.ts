import type { z } from 'zod'
import { ProviderInvalidResponseError } from '#shared/domain/errors'
import type { Platform } from '#shared/domain/availability'
import { slugify } from '#shared/domain/slug'
import type { Cache, Logger, Metrics } from '../../../application/ports'
import { CACHE_POLICIES } from '../../../application/cache-policies'
import type { ResilientHttpClient } from '../../resilience/resilient-http-client'
import { ANILIST_PROVIDER_ID } from './mapper'
import { MEDIA_DETAIL_QUERY, PLATFORMS_QUERY } from './queries'
import { graphQlEnvelopeSchema, mediaDetailResponseSchema, platformsResponseSchema } from './schemas'

const HIDDEN_PLATFORMS = new Set(['fakku', 'doujin'])
const NOT_FOUND_STATUS = 404

export interface AniListGatewayOptions {
  readonly endpoint: string
  readonly http: ResilientHttpClient
  readonly cache: Cache
  readonly logger: Logger
  readonly metrics: Metrics
}

export interface PlatformDirectory {
  readonly platforms: readonly Platform[]
  siteIds(filter: { platformIds: readonly string[]; languages: readonly string[] }): number[]
}

interface PlatformSource {
  readonly siteId: number
  readonly platformId: string
  readonly name: string
  readonly language: string | null
}

export class AniListGateway {
  constructor(private readonly options: AniListGatewayOptions) {}

  get logger(): Logger {
    return this.options.logger
  }

  get metrics(): Metrics {
    return this.options.metrics
  }

  async query<S extends z.ZodType>(operation: string, document: string, variables: Record<string, unknown>, schema: S): Promise<z.infer<S> | null> {
    const response = await this.options.http.postJson(this.options.endpoint, { query: document, variables })
    const envelope = graphQlEnvelopeSchema.safeParse(response.body)
    if (!envelope.success) throw this.invalidResponse(operation, ['response is not a GraphQL envelope'])

    const errors = envelope.data.errors ?? []
    if (response.status === NOT_FOUND_STATUS || errors.some(error => error.status === NOT_FOUND_STATUS)) return null
    if (errors.length > 0 || response.status !== 200) {
      throw this.invalidResponse(operation, errors.length ? errors.map(error => error.message) : [`HTTP ${response.status}`])
    }

    const data = schema.safeParse(envelope.data.data)
    if (!data.success) {
      throw this.invalidResponse(operation, data.error.issues.slice(0, 5).map(issue => `${issue.path.join('.')}: ${issue.message}`))
    }
    return data.data
  }

  loadMediaDetail(id: number): Promise<unknown | null> {
    return this.options.cache.getOrLoad(`anilist:media:${id}`, CACHE_POLICIES.rawMedia, async () => {
      const data = await this.query('MediaDetail', MEDIA_DETAIL_QUERY, { id }, mediaDetailResponseSchema)
      return data?.Media ?? null
    })
  }

  loadPlatformDirectory(): Promise<PlatformDirectory> {
    return this.options.cache
      .getOrLoad('anilist:platform-sources', CACHE_POLICIES.facets, async () => {
        const data = await this.query('Platforms', PLATFORMS_QUERY, {}, platformsResponseSchema)
        return (data?.ExternalLinkSourceCollection ?? [])
          .filter(source => !source.isDisabled)
          .map((source): PlatformSource => ({
            siteId: source.id,
            platformId: slugify(source.site),
            name: source.site.trim(),
            language: source.language,
          }))
          .filter(source => !HIDDEN_PLATFORMS.has(source.platformId))
      })
      .then(createPlatformDirectory)
  }

  private invalidResponse(operation: string, issues: readonly string[]): ProviderInvalidResponseError {
    this.options.metrics.increment('provider_invalid_response', { provider: ANILIST_PROVIDER_ID, operation })
    this.options.logger.error('provider returned an invalid response', { operation, issues })
    return new ProviderInvalidResponseError(ANILIST_PROVIDER_ID, issues)
  }
}

export function createPlatformDirectory(sources: readonly PlatformSource[]): PlatformDirectory {
  const byPlatform = new Map<string, { name: string; languages: Set<string> }>()
  for (const source of sources) {
    const platform = byPlatform.get(source.platformId) ?? { name: source.name, languages: new Set<string>() }
    if (source.language) platform.languages.add(source.language)
    byPlatform.set(source.platformId, platform)
  }

  const platforms = [...byPlatform.entries()]
    .map(([id, platform]) => ({ id, name: platform.name, languages: [...platform.languages].sort() }))
    .sort((a, b) => a.name.localeCompare(b.name))

  return {
    platforms,
    siteIds: ({ platformIds, languages }) =>
      sources
        .filter(source => platformIds.length === 0 || platformIds.includes(source.platformId))
        .filter(source => languages.length === 0 || (source.language !== null && languages.includes(source.language)))
        .map(source => source.siteId),
  }
}
