import type { MangaId } from './manga'
import type { MangaSnapshot } from './library'

export const HISTORY_SCHEMA_VERSION = 1
export const VIEW_HISTORY_CAPACITY = 60
export const SEARCH_HISTORY_CAPACITY = 8

export interface ViewHistoryEntry {
  readonly manga: MangaSnapshot
  readonly viewedAt: string
}

export interface ViewHistory {
  readonly version: typeof HISTORY_SCHEMA_VERSION
  readonly entries: readonly ViewHistoryEntry[]
}

export function emptyViewHistory(): ViewHistory {
  return { version: HISTORY_SCHEMA_VERSION, entries: [] }
}

export function recordView(history: ViewHistory, manga: MangaSnapshot, now: string): ViewHistory {
  const others = history.entries.filter(entry => entry.manga.id !== manga.id)
  return { ...history, entries: [{ manga, viewedAt: now }, ...others].slice(0, VIEW_HISTORY_CAPACITY) }
}

export function forgetView(history: ViewHistory, mangaId: MangaId): ViewHistory {
  return { ...history, entries: history.entries.filter(entry => entry.manga.id !== mangaId) }
}

export function recordSearchTerm(terms: readonly string[], term: string): string[] {
  const normalized = term.trim().replace(/\s+/g, ' ')
  if (!normalized) return [...terms]
  const others = terms.filter(existing => existing.toLowerCase() !== normalized.toLowerCase())
  return [normalized, ...others].slice(0, SEARCH_HISTORY_CAPACITY)
}
