import type { MangaSummary } from '#shared/domain/manga'
import { searchCacheKey, type SearchQuery } from '#shared/domain/search'

export const AUTO_LOAD_PAGE_LIMIT = 3

export function useSearchResults(query: MaybeRefOrGetter<SearchQuery>) {
  const baseQuery = computed(() => ({ ...toValue(query), page: 1 }))
  const key = computed(() => `search:${searchCacheKey(baseQuery.value)}`)

  const firstPage = useAsyncData(key, () => fetchSearchPage(baseQuery.value), { dedupe: 'cancel' })

  const extraItems = shallowRef<MangaSummary[]>([])
  const lastLoadedPage = ref(1)
  const lastPageHasNext = ref<boolean | null>(null)
  const loadingMore = ref(false)
  const loadMoreFailed = ref(false)

  watch(key, () => {
    extraItems.value = []
    lastLoadedPage.value = 1
    lastPageHasNext.value = null
    loadMoreFailed.value = false
  })

  const items = computed(() => {
    const seen = new Set<string>()
    return [...(firstPage.data.value?.items ?? []), ...extraItems.value].filter(manga => {
      if (seen.has(manga.id)) return false
      seen.add(manga.id)
      return true
    })
  })

  const hasMore = computed(() => lastPageHasNext.value ?? firstPage.data.value?.hasNextPage ?? false)
  const canAutoLoad = computed(() => hasMore.value && lastLoadedPage.value < AUTO_LOAD_PAGE_LIMIT && !loadMoreFailed.value)

  async function loadMore() {
    if (loadingMore.value || !hasMore.value) return
    const requestKey = key.value
    loadingMore.value = true
    loadMoreFailed.value = false
    try {
      const page = await fetchSearchPage({ ...baseQuery.value, page: lastLoadedPage.value + 1 })
      if (requestKey !== key.value) return
      extraItems.value = [...extraItems.value, ...page.items]
      lastLoadedPage.value = page.page
      lastPageHasNext.value = page.hasNextPage
    } catch (error) {
      console.warn('[search] failed to load next page', error)
      if (requestKey === key.value) loadMoreFailed.value = true
    } finally {
      loadingMore.value = false
    }
  }

  return {
    whenReady: () => firstPage,
    items,
    total: computed(() => firstPage.data.value?.total ?? null),
    status: firstPage.status,
    error: firstPage.error,
    refresh: firstPage.refresh,
    hasMore,
    canAutoLoad,
    loadMore,
    loadingMore,
    loadMoreFailed,
  }
}
