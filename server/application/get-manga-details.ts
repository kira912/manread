import { NotFoundError } from '#shared/domain/errors'
import type { MangaDetails, MangaId, MangaSummary } from '#shared/domain/manga'
import { CACHE_POLICIES } from './cache-policies'
import { cacheKey, type CatalogContext } from './context'
import { getAvailability } from './get-availability'

export const RECOMMENDATION_LIMIT = 12

export async function getMangaDetails(context: CatalogContext, id: MangaId): Promise<MangaDetails> {
  const manga = await context.cache.getOrLoad(cacheKey(context, 'manga', id), CACHE_POLICIES.mangaDetails, () => context.catalog.getManga(id))
  if (!manga) throw new NotFoundError('Manga', id)

  const { availability, degraded } = await getAvailability(context, manga)
  return { manga, availability, availabilityDegraded: degraded }
}

export async function getRecommendations(context: CatalogContext, id: MangaId): Promise<MangaSummary[]> {
  return context.cache.getOrLoad(cacheKey(context, 'recommendations', id), CACHE_POLICIES.recommendations, () =>
    context.catalog.getRecommendations(id, RECOMMENDATION_LIMIT),
  )
}
