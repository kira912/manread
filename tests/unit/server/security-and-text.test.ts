import { describe, expect, it } from 'vitest'
import { createLogger } from '../../../server/infrastructure/observability/logger'
import { InMemoryMetrics } from '../../../server/infrastructure/observability/metrics'
import { parseSafeExternalUrl } from '../../../server/infrastructure/security/url-policy'
import { htmlToParagraphs } from '../../../server/infrastructure/text/sanitize'

describe('parseSafeExternalUrl', () => {
  it.each([
    ['https://mangaplus.shueisha.co.jp/titles/1', true],
    ['http://mangaplus.shueisha.co.jp/titles/1', false],
    ['javascript:alert(1)', false],
    ['https://user:pass@example.com', false],
    ['https://127.0.0.1/admin', false],
    ['https://[::1]/', false],
    ['https://localhost/', false],
    ['https://printer.local/', false],
    ['https://intranet/', false],
    ['https://example.com:8443/', false],
    ['not a url', false],
  ])('%s → %s', (url, allowed) => {
    expect(parseSafeExternalUrl(url) !== null).toBe(allowed)
  })

  it('enforces host allow-lists including subdomains', () => {
    expect(parseSafeExternalUrl('https://s4.anilist.co/a.jpg', ['anilist.co'])).not.toBeNull()
    expect(parseSafeExternalUrl('https://anilist.co.evil.com/a.jpg', ['anilist.co'])).toBeNull()
  })
})

describe('htmlToParagraphs', () => {
  it('strips every tag and keeps only text', () => {
    expect(htmlToParagraphs('<script>alert(1)</script><b>Bold</b> <img src=x onerror=alert(1)>text')).toEqual(['alert(1)Bold text'])
  })

  it('decodes entities and splits paragraphs', () => {
    expect(htmlToParagraphs('Tom &amp; Jerry&#39;s<br><br>&#x2014;End &lt;3')).toEqual(["Tom & Jerry's", '—End <3'])
  })

  it('drops control characters from numeric entities', () => {
    expect(htmlToParagraphs('a&#0;b&#7;c')).toEqual(['abc'])
  })

  it('handles empty input', () => {
    expect(htmlToParagraphs(null)).toEqual([])
  })
})

describe('observability', () => {
  it('redacts sensitive fields and respects the level', () => {
    const lines: string[] = []
    const logger = createLogger({ level: 'info', write: line => lines.push(line) })
    logger.debug('hidden')
    logger.child({ requestId: 'r1' }).info('hello', { token: 'secret', nested: { password: 'x', ok: 1 }, error: new Error('boom') })
    expect(lines).toHaveLength(1)
    const record = JSON.parse(lines[0]!)
    expect(record).toMatchObject({ level: 'info', message: 'hello', requestId: 'r1', token: '[redacted]', nested: { password: '[redacted]', ok: 1 } })
    expect(record.error).toEqual({ name: 'Error', message: 'boom' })
  })

  it('aggregates counters and latency percentiles', () => {
    const metrics = new InMemoryMetrics()
    metrics.increment('hits', { route: 'a' })
    metrics.increment('hits', { route: 'a' })
    for (let value = 1; value <= 100; value += 1) metrics.observe('latency', value)
    const snapshot = metrics.snapshot()
    expect(snapshot.counters['hits{route="a"}']).toBe(2)
    expect(snapshot.latencies.latency).toMatchObject({ count: 100, p50Ms: 51, p95Ms: 96 })
  })
})
