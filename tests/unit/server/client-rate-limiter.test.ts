import { describe, expect, it } from 'vitest'
import { ClientRateLimiter } from '../../../server/infrastructure/security/client-rate-limiter'
import { manualClock } from '../../support/fakes'

describe('ClientRateLimiter', () => {
  const rules = [
    { prefix: '/api/telemetry/', requestsPerMinute: 2 },
    { prefix: '/api/', requestsPerMinute: 3 },
  ]

  it('limits each client independently per rule', () => {
    const clock = manualClock()
    const limiter = new ClientRateLimiter(rules, 100, clock.now)
    for (let index = 0; index < 3; index += 1) expect(limiter.check('a', '/api/home').allowed).toBe(true)
    expect(limiter.check('a', '/api/home')).toEqual({ allowed: false, retryAfterSeconds: 20 })
    expect(limiter.check('b', '/api/home').allowed).toBe(true)
    expect(limiter.check('a', '/api/telemetry/vitals').allowed).toBe(true)
    clock.advance(20_000)
    expect(limiter.check('a', '/api/home').allowed).toBe(true)
  })

  it('ignores paths without a rule and bounds memory', () => {
    const limiter = new ClientRateLimiter(rules, 2)
    expect(limiter.check('a', '/manga/1').allowed).toBe(true)
    for (const client of ['a', 'b', 'c', 'd']) limiter.check(client, '/api/x')
    expect((limiter as unknown as { buckets: Map<string, unknown> }).buckets.size).toBe(2)
  })
})
