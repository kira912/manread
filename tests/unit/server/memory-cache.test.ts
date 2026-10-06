import { describe, expect, it, vi } from 'vitest'
import { MemoryCache } from '../../../server/infrastructure/cache/memory-cache'
import { manualClock, RecordingMetrics, silentLogger } from '../../support/fakes'

const policy = { freshMs: 100, staleMs: 1000 }

function createCache(maxEntries = 10) {
  const clock = manualClock()
  const metrics = new RecordingMetrics()
  const cache = new MemoryCache({ maxEntries, logger: silentLogger, metrics, now: clock.now })
  return { cache, clock, metrics }
}

describe('MemoryCache', () => {
  it('serves fresh values without calling the loader again', async () => {
    const { cache } = createCache()
    const loader = vi.fn().mockResolvedValue('a')
    await cache.getOrLoad('k', policy, loader)
    await expect(cache.getOrLoad('k', policy, loader)).resolves.toBe('a')
    expect(loader).toHaveBeenCalledTimes(1)
  })

  it('deduplicates concurrent loads of the same key', async () => {
    const { cache } = createCache()
    const loader = vi.fn(() => new Promise(resolve => setTimeout(() => resolve('a'), 5)))
    const results = await Promise.all([cache.getOrLoad('k', policy, loader), cache.getOrLoad('k', policy, loader)])
    expect(results).toEqual(['a', 'a'])
    expect(loader).toHaveBeenCalledTimes(1)
  })

  it('serves stale values while revalidating in the background', async () => {
    const { cache, clock } = createCache()
    await cache.getOrLoad('k', policy, async () => 'old')
    clock.advance(policy.freshMs + 1)
    const loader = vi.fn().mockResolvedValue('new')
    await expect(cache.getOrLoad('k', policy, loader)).resolves.toBe('old')
    await vi.waitFor(() => expect(loader).toHaveBeenCalledTimes(1))
    await expect(cache.getOrLoad('k', policy, loader)).resolves.toBe('new')
  })

  it('keeps the stale value when revalidation fails', async () => {
    const { cache, clock, metrics } = createCache()
    await cache.getOrLoad('k', policy, async () => 'old')
    clock.advance(policy.freshMs + 1)
    await cache.getOrLoad('k', policy, () => Promise.reject(new Error('down')))
    await vi.waitFor(() => expect(metrics.counters.get('cache_revalidation_failed')).toBe(1))
    await expect(cache.getOrLoad('k', policy, () => Promise.reject(new Error('down')))).resolves.toBe('old')
  })

  it('reloads after the stale window and propagates loader errors', async () => {
    const { cache, clock } = createCache()
    await cache.getOrLoad('k', policy, async () => 'old')
    clock.advance(policy.freshMs + policy.staleMs + 1)
    await expect(cache.getOrLoad('k', policy, () => Promise.reject(new Error('down')))).rejects.toThrow('down')
  })

  it('does not cache failures', async () => {
    const { cache } = createCache()
    await expect(cache.getOrLoad('k', policy, () => Promise.reject(new Error('x')))).rejects.toThrow()
    await expect(cache.getOrLoad('k', policy, async () => 'ok')).resolves.toBe('ok')
  })

  it('evicts the least recently used entry', async () => {
    const { cache } = createCache(2)
    await cache.getOrLoad('a', policy, async () => 1)
    await cache.getOrLoad('b', policy, async () => 2)
    await cache.getOrLoad('a', policy, async () => 1)
    await cache.getOrLoad('c', policy, async () => 3)
    const loader = vi.fn().mockResolvedValue(2)
    await cache.getOrLoad('b', policy, loader)
    expect(loader).toHaveBeenCalled()
    expect(cache.size).toBe(2)
  })

  it('invalidates by prefix', async () => {
    const { cache } = createCache()
    await cache.getOrLoad('manga:1', policy, async () => 1)
    await cache.getOrLoad('manga:2', policy, async () => 2)
    await cache.getOrLoad('home', policy, async () => 3)
    expect(cache.invalidate('manga:')).toBe(2)
    expect(cache.size).toBe(1)
  })
})
