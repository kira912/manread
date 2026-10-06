import type { Cache, CachePolicy, Logger, Metrics } from '../../server/application/ports'

export const silentLogger: Logger = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
  child: () => silentLogger,
}

export class RecordingMetrics implements Metrics {
  readonly counters = new Map<string, number>()

  increment(name: string, labels?: Readonly<Record<string, string>>): void {
    const key = labels ? `${name}:${Object.values(labels).join(',')}` : name
    this.counters.set(key, (this.counters.get(key) ?? 0) + 1)
  }

  observe(): void {}
}

export const passthroughCache: Cache = {
  getOrLoad: <T>(_key: string, _policy: CachePolicy, loader: () => Promise<T>) => loader(),
  invalidate: () => 0,
}

export function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } })
}

export function manualClock(start = 0) {
  let now = start
  return {
    now: () => now,
    advance: (ms: number) => {
      now += ms
    },
  }
}
