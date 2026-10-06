import type { EditorialPickConfig } from '../config/editorial'
import type { AvailabilityProvider, Cache, CatalogProvider, ChapterSource, Logger, Metrics } from './ports'

export interface CatalogContext {
  readonly catalog: CatalogProvider
  readonly availabilityProviders: readonly AvailabilityProvider[]
  readonly chapterSources: readonly ChapterSource[]
  readonly cache: Cache
  readonly logger: Logger
  readonly metrics: Metrics
  readonly editorialPicks: readonly EditorialPickConfig[]
}

export function cacheKey(context: CatalogContext, ...parts: readonly (string | number)[]): string {
  return [context.catalog.id, ...parts].join(':')
}

export function describeError(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error)
}
