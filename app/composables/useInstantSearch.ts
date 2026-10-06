import type { CreatorSummary } from '#shared/domain/creator'
import type { MangaSummary } from '#shared/domain/manga'

export interface InstantResults {
  readonly manga: readonly MangaSummary[]
  readonly creators: readonly CreatorSummary[]
}

export type InstantSearchStatus = 'idle' | 'loading' | 'success' | 'error'

const DEBOUNCE_MS = 140
const MIN_LENGTH = 2
const CACHE_CAPACITY = 40
const resultCache = new LruMap<string, InstantResults>(CACHE_CAPACITY)

export function normalizeTerm(term: string): string {
  return term.replace(/\s+/g, ' ').trim()
}

export function useInstantSearch() {
  const term = ref('')
  const results = shallowRef<InstantResults | null>(null)
  const status = ref<InstantSearchStatus>('idle')
  let controller: AbortController | null = null
  let timer: ReturnType<typeof setTimeout> | undefined

  const cancelPending = () => {
    clearTimeout(timer)
    controller?.abort()
    controller = null
  }

  const execute = async (text: string) => {
    controller?.abort()
    const current = new AbortController()
    controller = current
    try {
      const data = await $fetch<InstantResults>('/api/search/instant', { query: { q: text }, signal: current.signal })
      resultCache.set(text.toLowerCase(), data)
      if (current.signal.aborted) return
      results.value = data
      status.value = 'success'
    } catch (error) {
      if (current.signal.aborted) return
      console.warn('[search] instant search failed', error)
      status.value = 'error'
    }
  }

  watch(term, value => {
    cancelPending()
    const text = normalizeTerm(value)
    if (text.length < MIN_LENGTH) {
      results.value = null
      status.value = 'idle'
      return
    }
    const cached = resultCache.get(text.toLowerCase())
    if (cached) {
      results.value = cached
      status.value = 'success'
      return
    }
    status.value = 'loading'
    timer = setTimeout(() => void execute(text), DEBOUNCE_MS)
  })

  const retry = () => {
    const text = normalizeTerm(term.value)
    if (text.length < MIN_LENGTH) return
    status.value = 'loading'
    void execute(text)
  }

  onScopeDispose(cancelPending)

  return { term, results, status, retry, minLength: MIN_LENGTH }
}
