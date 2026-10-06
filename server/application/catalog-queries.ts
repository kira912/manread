import type { CreatorProfile } from '#shared/domain/creator'
import type { SearchFacets } from '#shared/domain/discovery'
import { NotFoundError } from '#shared/domain/errors'
import type { MangaSummary } from '#shared/domain/manga'
import { CACHE_POLICIES } from './cache-policies'
import { cacheKey, type CatalogContext } from './context'

export const SITEMAP_MANGA_LIMIT = 300
const PREFERRED_LANGUAGE = 'English'

export async function getCreator(context: CatalogContext, id: string): Promise<CreatorProfile> {
  const creator = await context.cache.getOrLoad(cacheKey(context, 'creator', id), CACHE_POLICIES.creator, () => context.catalog.getCreator(id))
  if (!creator) throw new NotFoundError('Creator', id)
  return creator
}

export function getSearchFacets(context: CatalogContext): Promise<SearchFacets> {
  return context.cache.getOrLoad(cacheKey(context, 'facets'), CACHE_POLICIES.facets, async () => {
    const [genres, platforms] = await Promise.all([context.catalog.listGenres(), context.catalog.listPlatforms()])
    const languageCounts = new Map<string, number>()
    for (const language of platforms.flatMap(platform => platform.languages)) {
      languageCounts.set(language, (languageCounts.get(language) ?? 0) + 1)
    }
    const languages = [...languageCounts.entries()]
      .sort(([a, aCount], [b, bCount]) => Number(b === PREFERRED_LANGUAGE) - Number(a === PREFERRED_LANGUAGE) || bCount - aCount || a.localeCompare(b))
      .map(([language]) => language)
    return { genres, platforms, languages }
  })
}

export function listSitemapManga(context: CatalogContext): Promise<Pick<MangaSummary, 'id' | 'slug'>[]> {
  return context.cache.getOrLoad(cacheKey(context, 'sitemap'), CACHE_POLICIES.sitemap, () => context.catalog.listIndexableManga(SITEMAP_MANGA_LIMIT))
}
