import { TokenBucket } from '../resilience/token-bucket'

export interface RateLimitRule {
  readonly prefix: string
  readonly requestsPerMinute: number
}

export type RateLimitDecision = { readonly allowed: true } | { readonly allowed: false; readonly retryAfterSeconds: number }

const SECONDS_PER_MINUTE = 60

export class ClientRateLimiter {
  private readonly buckets = new Map<string, TokenBucket>()

  constructor(
    private readonly rules: readonly RateLimitRule[],
    private readonly maxTrackedClients: number,
    private readonly now: () => number = Date.now,
  ) {}

  check(clientId: string, path: string): RateLimitDecision {
    const rule = this.rules.find(candidate => path.startsWith(candidate.prefix))
    if (!rule) return { allowed: true }

    const key = `${rule.prefix}|${clientId}`
    const bucket = this.bucketFor(key, rule)
    if (bucket.tryTake()) return { allowed: true }
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(bucket.msUntilNextToken() / 1000)) }
  }

  private bucketFor(key: string, rule: RateLimitRule): TokenBucket {
    const existing = this.buckets.get(key)
    if (existing) {
      this.buckets.delete(key)
      this.buckets.set(key, existing)
      return existing
    }
    const bucket = new TokenBucket({ capacity: rule.requestsPerMinute, refillPerSecond: rule.requestsPerMinute / SECONDS_PER_MINUTE, now: this.now })
    this.buckets.set(key, bucket)
    if (this.buckets.size > this.maxTrackedClients) {
      const oldest = this.buckets.keys().next()
      if (!oldest.done) this.buckets.delete(oldest.value)
    }
    return bucket
  }
}
