import { describe, expect, it, vi } from 'vitest'
import { ProviderRateLimitedError, ProviderUnavailableError } from '#shared/domain/errors'
import { CircuitBreaker } from '../../../server/infrastructure/resilience/circuit-breaker'
import { parseRetryAfter, ResilientHttpClient } from '../../../server/infrastructure/resilience/resilient-http-client'
import { TokenBucket } from '../../../server/infrastructure/resilience/token-bucket'
import { jsonResponse, RecordingMetrics, silentLogger } from '../../support/fakes'

function createClient(fetchImpl: typeof fetch, overrides: { capacity?: number; threshold?: number } = {}) {
  const metrics = new RecordingMetrics()
  const client = new ResilientHttpClient({
    providerId: 'test',
    timeoutMs: 50,
    retries: 2,
    maxRetryDelayMs: 100,
    maxQueueWaitMs: 0,
    breaker: new CircuitBreaker({ failureThreshold: overrides.threshold ?? 10, cooldownMs: 10_000 }),
    limiter: new TokenBucket({ capacity: overrides.capacity ?? 100, refillPerSecond: 0.001 }),
    logger: silentLogger,
    metrics,
    fetch: fetchImpl,
    sleep: async () => undefined,
  })
  return { client, metrics }
}

describe('ResilientHttpClient', () => {
  it('returns parsed JSON with the status', async () => {
    const { client } = createClient(vi.fn().mockResolvedValue(jsonResponse({ ok: true })))
    await expect(client.postJson('https://api.example.com', {})).resolves.toEqual({ status: 200, body: { ok: true } })
  })

  it('retries 5xx responses then succeeds', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(jsonResponse({}, 503)).mockResolvedValueOnce(jsonResponse({ ok: 1 }))
    const { client, metrics } = createClient(fetchImpl)
    await expect(client.postJson('https://api.example.com', {})).resolves.toMatchObject({ status: 200 })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(metrics.counters.get('provider_retry:test')).toBe(1)
  })

  it('does not retry client errors', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ errors: [] }, 400))
    const { client } = createClient(fetchImpl)
    await expect(client.postJson('https://api.example.com', {})).resolves.toMatchObject({ status: 400 })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('maps persistent 429 to a rate-limited error', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({}, 429, { 'retry-after': '0' }))
    const { client } = createClient(fetchImpl)
    await expect(client.postJson('https://api.example.com', {})).rejects.toBeInstanceOf(ProviderRateLimitedError)
    expect(fetchImpl).toHaveBeenCalledTimes(3)
  })

  it('fails fast when the local rate limit is exhausted', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({}))
    const { client } = createClient(fetchImpl, { capacity: 1 })
    await client.postJson('https://api.example.com', {})
    await expect(client.postJson('https://api.example.com', {})).rejects.toBeInstanceOf(ProviderRateLimitedError)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('wraps network failures and opens the circuit', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('fetch failed'))
    const { client } = createClient(fetchImpl, { threshold: 3 })
    await expect(client.postJson('https://api.example.com', {})).rejects.toBeInstanceOf(ProviderUnavailableError)
    expect(client.circuitState).toBe('open')
    await expect(client.postJson('https://api.example.com', {})).rejects.toThrow(/circuit open/)
    expect(fetchImpl).toHaveBeenCalledTimes(3)
  })

  it('times out slow upstreams', async () => {
    const fetchImpl = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(init.signal?.reason))),
    )
    const { client } = createClient(fetchImpl as unknown as typeof fetch)
    await expect(client.postJson('https://api.example.com', {})).rejects.toBeInstanceOf(ProviderUnavailableError)
  })

  it('rejects non-JSON bodies', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('<html>', { status: 200 }))
    const { client } = createClient(fetchImpl)
    await expect(client.postJson('https://api.example.com', {})).rejects.toBeInstanceOf(ProviderUnavailableError)
  })
})

describe('parseRetryAfter', () => {
  it('parses seconds and HTTP dates', () => {
    expect(parseRetryAfter('3')).toBe(3000)
    expect(parseRetryAfter(new Date(10_000).toUTCString(), 4_000)).toBe(6000)
    expect(parseRetryAfter('garbage')).toBeNull()
    expect(parseRetryAfter(null)).toBeNull()
  })
})
