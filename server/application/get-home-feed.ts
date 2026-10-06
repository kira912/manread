import { DISCOVERY_SECTIONS, type EditorialPick, type HomeFeed, type HomeHero } from '#shared/domain/discovery'
import { groupAvailabilityByPlatform } from '#shared/domain/availability'
import type { MangaSummary } from '#shared/domain/manga'
import { CACHE_POLICIES } from './cache-policies'
import { cacheKey, describeError, type CatalogContext } from './context'
import { getMangaDetails } from './get-manga-details'

export const HOME_SECTION_SIZE = 12
const HERO_CANDIDATES = 3

export function getHomeFeed(context: CatalogContext): Promise<HomeFeed> {
  return context.cache.getOrLoad(cacheKey(context, 'home'), CACHE_POLICIES.home, () => buildHomeFeed(context))
}

async function buildHomeFeed(context: CatalogContext): Promise<HomeFeed> {
  const [sections, editorsPicks] = await Promise.all([
    context.catalog.getDiscovery(DISCOVERY_SECTIONS, HOME_SECTION_SIZE),
    loadEditorialPicks(context),
  ])
  const hero = await loadHero(context, sections.trending ?? [])
  return { hero, sections, editorsPicks, generatedAt: new Date().toISOString() }
}

async function loadEditorialPicks(context: CatalogContext): Promise<EditorialPick[]> {
  if (context.editorialPicks.length === 0) return []
  try {
    const manga = await context.catalog.getMangaBatch(context.editorialPicks.map(pick => pick.mangaId))
    const notes = new Map(context.editorialPicks.map(pick => [pick.mangaId, pick.note]))
    return manga.map(item => ({ manga: item, note: notes.get(item.id) ?? '' }))
  } catch (error) {
    context.metrics.increment('home_section_failed', { section: 'editorsPicks' })
    context.logger.warn('editorial picks unavailable', { error: describeError(error) })
    return []
  }
}

async function loadHero(context: CatalogContext, trending: readonly MangaSummary[]): Promise<HomeHero | null> {
  const candidates = trending.slice(0, HERO_CANDIDATES)
  const fallback = candidates[0]
  if (!fallback) return null

  for (const candidate of candidates) {
    try {
      const details = await getMangaDetails(context, candidate.id)
      if (details.availability.length === 0) continue
      return {
        manga: candidate,
        synopsis: details.manga.synopsis,
        platforms: groupAvailabilityByPlatform(details.availability).map(platform => ({ id: platform.platformId, name: platform.platformName })),
      }
    } catch (error) {
      context.metrics.increment('home_section_failed', { section: 'hero' })
      context.logger.warn('hero candidate unavailable', { mangaId: candidate.id, error: describeError(error) })
    }
  }
  return { manga: fallback, synopsis: [], platforms: [] }
}
