import type { Cache, CachePolicy, Logger, Metrics } from '../../application/ports'

interface CacheEntry {
  readonly value: unknown
  readonly freshUntil: number
  readonly staleUntil: number
}

export interface MemoryCacheOptions {
  readonly maxEntries: number
  readonly logger: Logger
  readonly metrics: Metrics
  readonly now?: () => number
}

export class MemoryCache implements Cache {
  private readonly entries = new Map<string, CacheEntry>()
  private readonly inflight = new Map<string, Promise<unknown>>()
  private readonly now: () => number

  constructor(private readonly options: MemoryCacheOptions) {
    this.now = options.now ?? Date.now
  }

  get size(): number {
    return this.entries.size
  }

  async getOrLoad<T>(key: string, policy: CachePolicy, loader: () => Promise<T>): Promise<T> {
    const entry = this.read(key)
    const now = this.now()

    if (entry && now < entry.freshUntil) {
      this.options.metrics.increment('cache_lookup', { result: 'hit' })
      return entry.value as T
    }

    if (entry && now < entry.staleUntil) {
      this.options.metrics.increment('cache_lookup', { result: 'stale' })
      this.revalidateInBackground(key, policy, loader)
      return entry.value as T
    }

    this.options.metrics.increment('cache_lookup', { result: 'miss' })
    return this.load(key, policy, loader)
  }

  invalidate(keyPrefix: string): number {
    let removed = 0
    for (const key of this.entries.keys()) {
      if (key.startsWith(keyPrefix)) {
        this.entries.delete(key)
        removed += 1
      }
    }
    return removed
  }

  private read(key: string): CacheEntry | undefined {
    const entry = this.entries.get(key)
    if (!entry) return undefined
    if (this.now() >= entry.staleUntil) {
      this.entries.delete(key)
      return undefined
    }
    this.entries.delete(key)
    this.entries.set(key, entry)
    return entry
  }

  private load<T>(key: string, policy: CachePolicy, loader: () => Promise<T>): Promise<T> {
    const pending = this.inflight.get(key)
    if (pending) return pending as Promise<T>

    const request = loader()
      .then(value => {
        this.write(key, value, policy)
        return value
      })
      .finally(() => this.inflight.delete(key))

    this.inflight.set(key, request)
    return request
  }

  private revalidateInBackground<T>(key: string, policy: CachePolicy, loader: () => Promise<T>): void {
    if (this.inflight.has(key)) return
    this.load(key, policy, loader).catch((error: unknown) => {
      this.options.metrics.increment('cache_revalidation_failed')
      this.options.logger.warn('cache revalidation failed, serving stale value', {
        key,
        error: error instanceof Error ? error.message : String(error),
      })
    })
  }

  private write(key: string, value: unknown, policy: CachePolicy): void {
    const now = this.now()
    this.entries.delete(key)
    this.entries.set(key, {
      value,
      freshUntil: now + policy.freshMs,
      staleUntil: now + policy.freshMs + policy.staleMs,
    })
    this.evictOverflow()
  }

  private evictOverflow(): void {
    while (this.entries.size > this.options.maxEntries) {
      const oldestKey = this.entries.keys().next().value
      if (oldestKey === undefined) return
      this.entries.delete(oldestKey)
    }
  }
}
