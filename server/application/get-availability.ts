import { mergeAvailability, type Availability } from '#shared/domain/availability'
import type { Manga } from '#shared/domain/manga'
import { CACHE_POLICIES } from './cache-policies'
import { cacheKey, describeError, type CatalogContext } from './context'

export interface AvailabilityResult {
  readonly availability: Availability[]
  readonly degraded: boolean
}

export async function getAvailability(context: CatalogContext, manga: Pick<Manga, 'id' | 'title' | 'alternativeTitles'>): Promise<AvailabilityResult> {
  const results = await Promise.allSettled(
    context.availabilityProviders.map(provider =>
      context.cache.getOrLoad(cacheKey(context, 'availability', provider.id, manga.id), CACHE_POLICIES.availability, () =>
        provider.getAvailability(manga),
      ),
    ),
  )

  const collected: Availability[][] = []
  let degraded = false
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      collected.push(result.value)
      return
    }
    degraded = true
    const providerId = context.availabilityProviders[index]?.id ?? 'unknown'
    context.metrics.increment('availability_provider_failed', { provider: providerId })
    context.logger.warn('availability provider failed', { provider: providerId, mangaId: manga.id, error: describeError(result.reason) })
  })

  return { availability: mergeAvailability(...collected), degraded }
}
