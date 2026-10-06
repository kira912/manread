export interface TokenBucketOptions {
  readonly capacity: number
  readonly refillPerSecond: number
  readonly now?: () => number
  readonly sleep?: (ms: number) => Promise<void>
}

export class TokenBucket {
  private tokens: number
  private lastRefill: number
  private readonly now: () => number
  private readonly sleep: (ms: number) => Promise<void>

  constructor(private readonly options: TokenBucketOptions) {
    this.now = options.now ?? Date.now
    this.sleep = options.sleep ?? (ms => new Promise(resolve => setTimeout(resolve, ms)))
    this.tokens = options.capacity
    this.lastRefill = this.now()
  }

  tryTake(): boolean {
    this.refill()
    if (this.tokens < 1) return false
    this.tokens -= 1
    return true
  }

  msUntilNextToken(): number {
    this.refill()
    if (this.tokens >= 1) return 0
    return Math.ceil(((1 - this.tokens) / this.options.refillPerSecond) * 1000)
  }

  async take(maxWaitMs: number): Promise<boolean> {
    const deadline = this.now() + maxWaitMs
    while (!this.tryTake()) {
      const wait = this.msUntilNextToken()
      if (this.now() + wait > deadline) return false
      await this.sleep(wait)
    }
    return true
  }

  private refill(): void {
    const now = this.now()
    const elapsedSeconds = (now - this.lastRefill) / 1000
    if (elapsedSeconds <= 0) return
    this.tokens = Math.min(this.options.capacity, this.tokens + elapsedSeconds * this.options.refillPerSecond)
    this.lastRefill = now
  }
}
