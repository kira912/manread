export interface RetryOptions {
  readonly retries: number
  readonly baseDelayMs: number
  readonly maxDelayMs: number
  readonly shouldRetry: (error: unknown) => boolean
  readonly delayHintMs?: (error: unknown) => number | null
  readonly sleep?: (ms: number) => Promise<void>
  readonly random?: () => number
  readonly onRetry?: (attempt: number, error: unknown, delayMs: number) => void
}

export async function retry<T>(operation: (attempt: number) => Promise<T>, options: RetryOptions): Promise<T> {
  const sleep = options.sleep ?? (ms => new Promise<void>(resolve => setTimeout(resolve, ms)))
  const random = options.random ?? Math.random

  for (let attempt = 0; ; attempt += 1) {
    try {
      return await operation(attempt)
    } catch (error) {
      if (attempt >= options.retries || !options.shouldRetry(error)) throw error
      const delay = retryDelay(attempt, error, options, random)
      if (delay === null) throw error
      options.onRetry?.(attempt + 1, error, delay)
      await sleep(delay)
    }
  }
}

function retryDelay(attempt: number, error: unknown, options: RetryOptions, random: () => number): number | null {
  const hint = options.delayHintMs?.(error) ?? null
  if (hint !== null) return hint <= options.maxDelayMs ? hint : null
  const exponential = Math.min(options.maxDelayMs, options.baseDelayMs * 2 ** attempt)
  return Math.round(exponential / 2 + (random() * exponential) / 2)
}
