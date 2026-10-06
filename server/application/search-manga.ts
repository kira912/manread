import type { MangaSummary } from '#shared/domain/manga'
import { searchCacheKey, type Page, type SearchQuery } from '#shared/domain/search'
import { CACHE_POLICIES } from './cache-policies'
import { cacheKey, type CatalogContext } from './context'
import type { InstantSearchResult } from './ports'

export const INSTANT_SEARCH_MIN_LENGTH = 2
export const INSTANT_SEARCH_LIMITS = { manga: 6, creators: 3 } as const

const EMPTY_INSTANT_RESULT: InstantSearchResult = { manga: [], creators: [] }

export function searchManga(context: CatalogContext, query: SearchQuery): Promise<Page<MangaSummary>> {
  context.metrics.increment('search_request', { kind: query.text ? 'text' : 'browse' })
  return context.cache.getOrLoad(cacheKey(context, 'search', searchCacheKey(query)), CACHE_POLICIES.search, () => context.catalog.search(query))
}

export function instantSearch(context: CatalogContext, rawText: string): Promise<InstantSearchResult> {
  const text = normalizeSearchText(rawText)
  if (text.length < INSTANT_SEARCH_MIN_LENGTH) return Promise.resolve(EMPTY_INSTANT_RESULT)
  context.metrics.increment('search_request', { kind: 'instant' })
  return context.cache.getOrLoad(cacheKey(context, 'instant', text.toLowerCase()), CACHE_POLICIES.instantSearch, () =>
    context.catalog.instantSearch(text, INSTANT_SEARCH_LIMITS),
  )
}

export function normalizeSearchText(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}
