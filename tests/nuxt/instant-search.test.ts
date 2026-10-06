import { registerEndpoint } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick } from 'vue'

const calls: string[] = []
registerEndpoint('/api/search/instant', {
  method: 'GET',
  handler: event => {
    const query = new URL(event.path, 'http://localhost').searchParams.get('q') ?? ''
    calls.push(query)
    if (query === 'boom') throw new Error('upstream down')
    return { manga: [{ id: '1', title: `Result for ${query}` }], creators: [] }
  },
})

describe('useInstantSearch', () => {
  beforeEach(() => {
    calls.length = 0
    vi.useFakeTimers()
  })
  afterEach(() => vi.useRealTimers())

  function setup() {
    const scope = effectScope()
    const search = scope.run(() => useInstantSearch())!
    return { search, scope }
  }

  it('debounces keystrokes into a single request', async () => {
    const { search, scope } = setup()
    for (const value of ['b', 'be', 'ber', 'bers']) {
      search.term.value = value
      await nextTick()
    }
    expect(search.status.value).toBe('loading')
    await vi.advanceTimersByTimeAsync(200)
    await vi.waitFor(() => expect(search.status.value).toBe('success'))
    expect(calls).toEqual(['bers'])
    scope.stop()
  })

  it('serves repeated terms from the in-memory cache', async () => {
    const { search, scope } = setup()
    search.term.value = 'vagabond'
    await nextTick()
    await vi.advanceTimersByTimeAsync(200)
    await vi.waitFor(() => expect(search.status.value).toBe('success'))
    search.term.value = 'x'
    await nextTick()
    search.term.value = 'Vagabond '
    await nextTick()
    expect(search.status.value).toBe('success')
    expect(calls).toEqual(['vagabond'])
    scope.stop()
  })

  it('stays idle below the minimum length and reports errors', async () => {
    const { search, scope } = setup()
    search.term.value = 'a'
    await nextTick()
    expect(search.status.value).toBe('idle')
    search.term.value = 'boom'
    await nextTick()
    await vi.advanceTimersByTimeAsync(200)
    await vi.waitFor(() => expect(search.status.value).toBe('error'))
    scope.stop()
  })
})
