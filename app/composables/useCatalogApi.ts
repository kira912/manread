import type { CreatorProfile } from '#shared/domain/creator'
import type { HomeFeed, SearchFacets } from '#shared/domain/discovery'
import { mangaPath, type MangaDetails, type MangaSummary } from '#shared/domain/manga'
import type { ChapterList, ReadableChapter } from '#shared/domain/reader'
import { toSearchUrlParams, type Page, type SearchQuery } from '#shared/domain/search'

export function useHomeFeed() {
  return useFetch<HomeFeed>('/api/home', { key: 'home-feed' })
}

export function useMangaDetails(id: MaybeRefOrGetter<string>) {
  return useFetch<MangaDetails>(() => `/api/manga/${toValue(id)}`, { key: `manga-${toValue(id)}` })
}

export function useRecommendations(id: MaybeRefOrGetter<string>, options: { lazy?: boolean; immediate?: boolean; server?: boolean } = {}) {
  return useFetch<MangaSummary[]>(() => `/api/manga/${toValue(id)}/recommendations`, {
    key: `recommendations-${toValue(id)}`,
    lazy: options.lazy ?? true,
    server: options.server ?? false,
    immediate: options.immediate ?? true,
    default: () => [],
  })
}

export function useChapters(mangaId: MaybeRefOrGetter<string>) {
  return useFetch<ChapterList>(() => `/api/manga/${toValue(mangaId)}/chapters`, {
    key: `chapters-${toValue(mangaId)}`,
    default: () => ({ chapters: [] }),
  })
}

export function useReadableChapter(chapterId: MaybeRefOrGetter<string>) {
  return useFetch<ReadableChapter>(() => `/api/reader/${encodeURIComponent(toValue(chapterId))}`, { key: `chapter-${toValue(chapterId)}` })
}

export function useCreator(id: MaybeRefOrGetter<string>) {
  return useFetch<CreatorProfile>(() => `/api/creator/${toValue(id)}`, { key: `creator-${toValue(id)}` })
}

export function useSearchFacets() {
  return useFetch<SearchFacets>('/api/search/facets', {
    key: 'search-facets',
    lazy: true,
    default: () => ({ genres: [], platforms: [], languages: [] }),
  })
}

export function fetchSearchPage(query: SearchQuery) {
  return $fetch<Page<MangaSummary>>('/api/search', { query: toSearchUrlParams(query) })
}

export function usePrefetchManga() {
  const prefetched = new Set<string>()
  return (manga: Pick<MangaSummary, 'id' | 'slug'>) => {
    if (import.meta.server || prefetched.has(manga.id)) return
    prefetched.add(manga.id)
    void preloadRouteComponents(mangaPath(manga))
    void fetch(`/api/manga/${manga.id}`, { priority: 'low' } as RequestInit).catch((error: unknown) =>
      console.warn('[prefetch] manga prefetch failed', error),
    )
  }
}
