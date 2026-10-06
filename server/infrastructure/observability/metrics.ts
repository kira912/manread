import type { Metrics } from '../../application/ports'

type Labels = Readonly<Record<string, string>>

interface Histogram {
  count: number
  sum: number
  samples: number[]
}

export interface MetricsSnapshot {
  readonly counters: Record<string, number>
  readonly latencies: Record<string, { count: number; avgMs: number; p50Ms: number; p95Ms: number }>
}

const RESERVOIR_SIZE = 256

export class InMemoryMetrics implements Metrics {
  private readonly counters = new Map<string, number>()
  private readonly histograms = new Map<string, Histogram>()

  increment(name: string, labels?: Labels): void {
    const key = metricKey(name, labels)
    this.counters.set(key, (this.counters.get(key) ?? 0) + 1)
  }

  observe(name: string, valueMs: number, labels?: Labels): void {
    const key = metricKey(name, labels)
    const histogram = this.histograms.get(key) ?? { count: 0, sum: 0, samples: [] }
    histogram.count += 1
    histogram.sum += valueMs
    if (histogram.samples.length < RESERVOIR_SIZE) {
      histogram.samples.push(valueMs)
    } else {
      histogram.samples[Math.floor(Math.random() * histogram.count) % RESERVOIR_SIZE] = valueMs
    }
    this.histograms.set(key, histogram)
  }

  snapshot(): MetricsSnapshot {
    const latencies: MetricsSnapshot['latencies'] = {}
    for (const [key, histogram] of this.histograms) {
      const sorted = histogram.samples.toSorted((a, b) => a - b)
      latencies[key] = {
        count: histogram.count,
        avgMs: round(histogram.sum / histogram.count),
        p50Ms: round(percentile(sorted, 0.5)),
        p95Ms: round(percentile(sorted, 0.95)),
      }
    }
    return { counters: Object.fromEntries(this.counters), latencies }
  }
}

function metricKey(name: string, labels?: Labels): string {
  if (!labels) return name
  const serialized = Object.entries(labels)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}="${value}"`)
    .join(',')
  return `${name}{${serialized}}`
}

function percentile(sorted: readonly number[], ratio: number): number {
  if (sorted.length === 0) return 0
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))] ?? 0
}

function round(value: number): number {
  return Math.round(value * 10) / 10
}
