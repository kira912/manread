import { StorageUnavailableError } from '#shared/domain/errors'

const KEY_PREFIX = 'manread:'

export interface Parser<T> {
  safeParse(input: unknown): { success: true; data: T } | { success: false }
}

export type LoadOutcome<T> =
  | { readonly status: 'loaded'; readonly value: T }
  | { readonly status: 'empty'; readonly value: T }
  | { readonly status: 'recovered'; readonly value: T; readonly backupKey: string | null }
  | { readonly status: 'unavailable'; readonly value: T }

export interface BrowserStore<T> {
  readonly key: string
  load(): LoadOutcome<T>
  save(value: T): void
  subscribe(onExternalChange: (value: T) => void): () => void
}

export function createBrowserStore<T>(name: string, schema: Parser<T>, fallback: () => T): BrowserStore<T> {
  const key = `${KEY_PREFIX}${name}`

  const load = (): LoadOutcome<T> => {
    const storage = resolveStorage()
    if (!storage) return { status: 'unavailable', value: fallback() }

    const raw = storage.getItem(key)
    if (raw === null) return { status: 'empty', value: fallback() }

    const parsed = schema.safeParse(parseJson(raw))
    if (parsed.success) return { status: 'loaded', value: parsed.data }

    return { status: 'recovered', value: fallback(), backupKey: backupCorruptedValue(storage, key, raw) }
  }

  const save = (value: T): void => {
    const storage = resolveStorage()
    if (!storage) throw new StorageUnavailableError('Le stockage du navigateur est désactivé')
    try {
      storage.setItem(key, JSON.stringify(value))
    } catch (error) {
      throw new StorageUnavailableError('Le stockage du navigateur est plein ou bloqué', { cause: error })
    }
  }

  const subscribe = (onExternalChange: (value: T) => void): (() => void) => {
    const listener = (event: StorageEvent) => {
      if (event.key !== key) return
      const outcome = load()
      onExternalChange(outcome.value)
    }
    window.addEventListener('storage', listener)
    return () => window.removeEventListener('storage', listener)
  }

  return { key, load, save, subscribe }
}

function resolveStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    const storage = window.localStorage
    const probe = `${KEY_PREFIX}probe`
    storage.setItem(probe, '1')
    storage.removeItem(probe)
    return storage
  } catch (error) {
    reportStorageIssue('storage probe failed', error)
    return null
  }
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown
  } catch (error) {
    reportStorageIssue('stored value is not valid JSON', error)
    return undefined
  }
}

function backupCorruptedValue(storage: Storage, key: string, raw: string): string | null {
  const backupKey = `${key}:corrupted:${Date.now()}`
  try {
    storage.setItem(backupKey, raw)
    return backupKey
  } catch (error) {
    reportStorageIssue('could not back up corrupted value', error)
    return null
  }
}

function reportStorageIssue(message: string, error: unknown): void {
  console.warn(`[storage] ${message}`, error)
}
