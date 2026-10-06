import { describe, expect, it, vi } from 'vitest'
import { CircuitBreaker, CircuitOpenError } from '../../../server/infrastructure/resilience/circuit-breaker'
import { retry } from '../../../server/infrastructure/resilience/retry'
import { TokenBucket } from '../../../server/infrastructure/resilience/token-bucket'
import { manualClock } from '../../support/fakes'

describe('CircuitBreaker', () => {
  const fail = () => Promise.reject(new Error('boom'))

  it('opens after consecutive failures, then probes after cooldown', async () => {
    const clock = manualClock()
    const states: string[] = []
    const breaker = new CircuitBreaker({ failureThreshold: 2, cooldownMs: 1000, now: clock.now, onStateChange: state => states.push(state) })
    await expect(breaker.execute(fail)).rejects.toThrow('boom')
    await expect(breaker.execute(fail)).rejects.toThrow('boom')
    await expect(breaker.execute(async () => 'never')).rejects.toBeInstanceOf(CircuitOpenError)
    clock.advance(1000)
    expect(breaker.currentState).toBe('half_open')
    await expect(breaker.execute(async () => 'ok')).resolves.toBe('ok')
    expect(breaker.currentState).toBe('closed')
    expect(states).toEqual(['open', 'half_open', 'closed'])
  })

  it('re-opens immediately when the probe fails', async () => {
    const clock = manualClock()
    const breaker = new CircuitBreaker({ failureThreshold: 1, cooldownMs: 100, now: clock.now })
    await expect(breaker.execute(fail)).rejects.toThrow()
    clock.advance(100)
    await expect(breaker.execute(fail)).rejects.toThrow('boom')
    expect(breaker.currentState).toBe('open')
  })

  it('resets the failure count after a success', async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 2, cooldownMs: 100 })
    await expect(breaker.execute(fail)).rejects.toThrow()
    await breaker.execute(async () => 'ok')
    await expect(breaker.execute(fail)).rejects.toThrow()
    expect(breaker.currentState).toBe('closed')
  })
})

describe('TokenBucket', () => {
  it('refills over time and waits within the allowed budget', async () => {
    const clock = manualClock()
    const sleep = vi.fn(async (ms: number) => clock.advance(ms))
    const bucket = new TokenBucket({ capacity: 2, refillPerSecond: 1, now: clock.now, sleep })
    expect(bucket.tryTake()).toBe(true)
    expect(bucket.tryTake()).toBe(true)
    expect(bucket.tryTake()).toBe(false)
    expect(bucket.msUntilNextToken()).toBe(1000)
    await expect(bucket.take(500)).resolves.toBe(false)
    await expect(bucket.take(1500)).resolves.toBe(true)
    expect(sleep).toHaveBeenCalledWith(1000)
  })
})

describe('retry', () => {
  const noSleep = async () => undefined

  it('retries retryable errors up to the limit', async () => {
    const operation = vi.fn().mockRejectedValueOnce(new Error('a')).mockRejectedValueOnce(new Error('b')).mockResolvedValue('ok')
    await expect(retry(operation, { retries: 2, baseDelayMs: 10, maxDelayMs: 100, shouldRetry: () => true, sleep: noSleep })).resolves.toBe('ok')
    expect(operation).toHaveBeenCalledTimes(3)
  })

  it('stops on non-retryable errors', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('fatal'))
    await expect(retry(operation, { retries: 5, baseDelayMs: 10, maxDelayMs: 100, shouldRetry: () => false, sleep: noSleep })).rejects.toThrow('fatal')
    expect(operation).toHaveBeenCalledTimes(1)
  })

  it('uses exponential backoff with jitter and honours delay hints', async () => {
    const delays: number[] = []
    const operation = vi.fn().mockRejectedValue(new Error('x'))
    await expect(
      retry(operation, {
        retries: 3,
        baseDelayMs: 100,
        maxDelayMs: 1000,
        shouldRetry: () => true,
        sleep: noSleep,
        random: () => 1,
        delayHintMs: () => (delays.length === 2 ? 50 : null),
        onRetry: (_attempt, _error, delay) => delays.push(delay),
      }),
    ).rejects.toThrow()
    expect(delays).toEqual([100, 200, 50])
  })

  it('gives up when the server asks to wait longer than allowed', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('slow down'))
    await expect(
      retry(operation, { retries: 3, baseDelayMs: 10, maxDelayMs: 100, shouldRetry: () => true, sleep: noSleep, delayHintMs: () => 60_000 }),
    ).rejects.toThrow('slow down')
    expect(operation).toHaveBeenCalledTimes(1)
  })
})
