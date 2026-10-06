import { ProviderRateLimitedError, ProviderUnavailableError } from '#shared/domain/errors'
import type { Logger, Metrics } from '../../application/ports'
import { CircuitBreaker, CircuitOpenError } from './circuit-breaker'
import { retry } from './retry'
import { TokenBucket } from './token-bucket'

export interface HttpResponse {
  readonly status: number
  readonly body: unknown
}

export interface ResilientHttpClientOptions {
  readonly providerId: string
  readonly timeoutMs: number
  readonly retries: number
  readonly maxRetryDelayMs: number
  readonly maxQueueWaitMs: number
  readonly breaker: CircuitBreaker
  readonly limiter: TokenBucket
  readonly logger: Logger
  readonly metrics: Metrics
  readonly fetch?: typeof globalThis.fetch
  readonly sleep?: (ms: number) => Promise<void>
}

class RetryableHttpError extends Error {
  constructor(readonly status: number, readonly retryAfterMs: number | null) {
    super(`Upstream responded with ${status}`)
    this.name = 'RetryableHttpError'
  }
}

const MAX_RESPONSE_BYTES = 2_000_000

export class ResilientHttpClient {
  private readonly fetchImpl: typeof globalThis.fetch

  constructor(private readonly options: ResilientHttpClientOptions) {
    this.fetchImpl = options.fetch ?? globalThis.fetch
  }

  get circuitState() {
    return this.options.breaker.currentState
  }

  async postJson(url: string, payload: unknown): Promise<HttpResponse> {
    const { providerId, metrics } = this.options
    const startedAt = performance.now()
    try {
      const response = await retry(() => this.attempt(url, payload), {
        retries: this.options.retries,
        baseDelayMs: 250,
        maxDelayMs: this.options.maxRetryDelayMs,
        sleep: this.options.sleep,
        shouldRetry: isRetryable,
        delayHintMs: error => (error instanceof RetryableHttpError ? error.retryAfterMs : null),
        onRetry: (attempt, error, delayMs) => {
          metrics.increment('provider_retry', { provider: providerId })
          this.options.logger.warn('retrying provider request', { attempt, delayMs, reason: describe(error) })
        },
      })
      metrics.increment('provider_request', { provider: providerId, outcome: 'success' })
      return response
    } catch (error) {
      metrics.increment('provider_request', { provider: providerId, outcome: 'failure' })
      throw this.toDomainError(error)
    } finally {
      metrics.observe('provider_latency', performance.now() - startedAt, { provider: providerId })
    }
  }

  private async attempt(url: string, payload: unknown): Promise<HttpResponse> {
    const acquired = await this.options.limiter.take(this.options.maxQueueWaitMs)
    if (!acquired) throw new ProviderRateLimitedError(this.options.providerId, this.options.limiter.msUntilNextToken())

    return this.options.breaker.execute(async () => {
      const response = await this.fetchImpl(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.options.timeoutMs),
        redirect: 'error',
      })

      if (response.status === 429 || response.status >= 500) {
        await response.body?.cancel()
        throw new RetryableHttpError(response.status, parseRetryAfter(response.headers.get('retry-after')))
      }

      return { status: response.status, body: await readJsonBody(response) }
    })
  }

  private toDomainError(error: unknown): Error {
    const { providerId } = this.options
    if (error instanceof ProviderRateLimitedError) return error
    if (error instanceof RetryableHttpError && error.status === 429) {
      return new ProviderRateLimitedError(providerId, error.retryAfterMs)
    }
    if (error instanceof CircuitOpenError) {
      return new ProviderUnavailableError(providerId, 'circuit open', { cause: error })
    }
    return new ProviderUnavailableError(providerId, describe(error), { cause: error })
  }
}

function isRetryable(error: unknown): boolean {
  if (error instanceof RetryableHttpError) return true
  if (error instanceof CircuitOpenError || error instanceof ProviderRateLimitedError) return false
  return error instanceof TypeError || (error instanceof DOMException && error.name === 'TimeoutError')
}

async function readJsonBody(response: Response): Promise<unknown> {
  const declaredLength = Number(response.headers.get('content-length') ?? 0)
  if (declaredLength > MAX_RESPONSE_BYTES) throw new Error('Upstream response too large')
  const text = await response.text()
  if (text.length > MAX_RESPONSE_BYTES) throw new Error('Upstream response too large')
  try {
    return JSON.parse(text) as unknown
  } catch (error) {
    throw new Error('Upstream response is not valid JSON', { cause: error })
  }
}

export function parseRetryAfter(header: string | null, now = Date.now()): number | null {
  if (!header) return null
  const seconds = Number(header)
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000)
  const date = Date.parse(header)
  return Number.isNaN(date) ? null : Math.max(0, date - now)
}

function describe(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}
