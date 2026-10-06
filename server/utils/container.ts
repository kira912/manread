import type { CatalogContext } from '../application/context'
import { createBundledManifestReader } from './content-manifests'
import type { AvailabilityProvider, CatalogProvider, Logger } from '../application/ports'
import { EDITORIAL_PICKS, FIXTURE_EDITORIAL_PICKS } from '../config/editorial'
import { MemoryCache } from '../infrastructure/cache/memory-cache'
import { ContentStore } from '../infrastructure/content/content-store'
import { createLogger, isLogLevel } from '../infrastructure/observability/logger'
import { InMemoryMetrics } from '../infrastructure/observability/metrics'
import { AniListAvailabilityProvider } from '../infrastructure/providers/anilist/availability-provider'
import { AniListCatalogProvider } from '../infrastructure/providers/anilist/catalog-provider'
import { AniListGateway } from '../infrastructure/providers/anilist/gateway'
import { FixtureCatalogProvider } from '../infrastructure/providers/fixture/fixture-provider'
import { parseSafeExternalUrl } from '../infrastructure/security/url-policy'
import { CircuitBreaker, type CircuitState } from '../infrastructure/resilience/circuit-breaker'
import { ResilientHttpClient } from '../infrastructure/resilience/resilient-http-client'
import { TokenBucket } from '../infrastructure/resilience/token-bucket'

const CACHE_MAX_ENTRIES = 5_000
const PROVIDER_TIMEOUT_MS = 6_000
const PROVIDER_RETRIES = 2
const MAX_RETRY_DELAY_MS = 3_000
const MAX_QUEUE_WAIT_MS = 2_500
const BREAKER_FAILURE_THRESHOLD = 5
const BREAKER_COOLDOWN_MS = 30_000
const SECONDS_PER_MINUTE = 60

export interface ProviderHealth {
  readonly id: string
  readonly circuit: CircuitState | 'not_applicable'
}

interface Container {
  readonly context: CatalogContext
  readonly metrics: InMemoryMetrics
  readonly logger: Logger
  readonly providerHealth: () => ProviderHealth[]
}

let container: Container | undefined

export function useContainer(): Container {
  container ??= createContainer()
  return container
}

export function useCatalogContext(): CatalogContext {
  return useContainer().context
}

export function useLogger(): Logger {
  return useContainer().logger
}

function createContainer(): Container {
  const config = useRuntimeConfig()
  const logger = createLogger({ level: isLogLevel(config.logLevel) ? config.logLevel : 'info', base: { service: 'manread' } })
  const metrics = new InMemoryMetrics()
  const cache = new MemoryCache({ maxEntries: CACHE_MAX_ENTRIES, logger: logger.child({ component: 'cache' }), metrics })

  const createContentStore = (catalogProviderId: string) =>
    new ContentStore({
      manifests: createBundledManifestReader(),
      catalogProviderId,
      cache,
      logger: logger.child({ component: 'content' }),
      metrics,
    })

  if (config.catalogProvider === 'fixture') {
    const fixture = new FixtureCatalogProvider()
    const contentStore = createContentStore(fixture.id)
    logger.info('catalog provider initialised', { provider: fixture.id })
    return {
      logger,
      metrics,
      context: {
        catalog: fixture,
        availabilityProviders: [fixture],
        chapterSources: [contentStore],
        cache,
        logger,
        metrics,
        editorialPicks: FIXTURE_EDITORIAL_PICKS,
      },
      providerHealth: () => [{ id: fixture.id, circuit: 'not_applicable' }],
    }
  }

  const endpoint = parseSafeExternalUrl(String(config.anilistEndpoint))
  if (!endpoint) throw new Error('NUXT_ANILIST_ENDPOINT must be a public https URL')

  const providerLogger = logger.child({ provider: 'anilist' })
  const requestsPerMinute = Math.max(1, Number(config.anilistRequestsPerMinute) || 1)
  const breaker = new CircuitBreaker({
    failureThreshold: BREAKER_FAILURE_THRESHOLD,
    cooldownMs: BREAKER_COOLDOWN_MS,
    onStateChange: state => {
      metrics.increment('provider_circuit_transition', { provider: 'anilist', state })
      providerLogger.warn('circuit state changed', { state })
    },
  })
  const http = new ResilientHttpClient({
    providerId: 'anilist',
    timeoutMs: PROVIDER_TIMEOUT_MS,
    retries: PROVIDER_RETRIES,
    maxRetryDelayMs: MAX_RETRY_DELAY_MS,
    maxQueueWaitMs: MAX_QUEUE_WAIT_MS,
    breaker,
    limiter: new TokenBucket({ capacity: requestsPerMinute, refillPerSecond: requestsPerMinute / SECONDS_PER_MINUTE }),
    logger: providerLogger,
    metrics,
  })
  const gateway = new AniListGateway({ endpoint, http, cache, logger: providerLogger, metrics })
  const catalog: CatalogProvider = new AniListCatalogProvider({ gateway })
  const availabilityProviders: AvailabilityProvider[] = [new AniListAvailabilityProvider(gateway)]
  const contentStore = createContentStore(catalog.id)

  logger.info('catalog provider initialised', { provider: catalog.id, requestsPerMinute })
  return {
    logger,
    metrics,
    context: { catalog, availabilityProviders, chapterSources: [contentStore], cache, logger, metrics, editorialPicks: EDITORIAL_PICKS },
    providerHealth: () => [{ id: catalog.id, circuit: http.circuitState }],
  }
}
