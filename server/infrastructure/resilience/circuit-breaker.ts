export type CircuitState = 'closed' | 'open' | 'half_open'

export interface CircuitBreakerOptions {
  readonly failureThreshold: number
  readonly cooldownMs: number
  readonly now?: () => number
  readonly onStateChange?: (state: CircuitState) => void
}

export class CircuitOpenError extends Error {
  constructor(readonly retryInMs: number) {
    super('Circuit is open')
    this.name = 'CircuitOpenError'
  }
}

export class CircuitBreaker {
  private state: CircuitState = 'closed'
  private consecutiveFailures = 0
  private openedAt = 0
  private probeInFlight = false
  private readonly now: () => number

  constructor(private readonly options: CircuitBreakerOptions) {
    this.now = options.now ?? Date.now
  }

  get currentState(): CircuitState {
    if (this.state === 'open' && this.cooldownElapsed()) return 'half_open'
    return this.state
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    this.assertCanExecute()
    try {
      const result = await operation()
      this.recordSuccess()
      return result
    } catch (error) {
      this.recordFailure()
      throw error
    } finally {
      this.probeInFlight = false
    }
  }

  private assertCanExecute(): void {
    if (this.state === 'closed') return
    if (this.state === 'open' && !this.cooldownElapsed()) {
      throw new CircuitOpenError(this.openedAt + this.options.cooldownMs - this.now())
    }
    if (this.probeInFlight) throw new CircuitOpenError(this.options.cooldownMs)
    this.transition('half_open')
    this.probeInFlight = true
  }

  private recordSuccess(): void {
    this.consecutiveFailures = 0
    if (this.state !== 'closed') this.transition('closed')
  }

  private recordFailure(): void {
    this.consecutiveFailures += 1
    if (this.state === 'half_open' || this.consecutiveFailures >= this.options.failureThreshold) {
      this.openedAt = this.now()
      this.transition('open')
    }
  }

  private cooldownElapsed(): boolean {
    return this.now() - this.openedAt >= this.options.cooldownMs
  }

  private transition(state: CircuitState): void {
    if (this.state === state) return
    this.state = state
    this.options.onStateChange?.(state)
  }
}
