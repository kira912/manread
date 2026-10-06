import { emptyConsent, type AnalyticsConsent } from '#shared/domain/consent'
import { emptyViewHistory, type ViewHistory } from '#shared/domain/history'
import { emptyLibrary, type Library } from '#shared/domain/library'
import { DEFAULT_READER_PREFERENCES, emptyReadingPositions, type ReaderPreferences, type ReadingPositions } from '#shared/domain/reader'
import { createBrowserStore } from './browser-store'
import { consentSchema, librarySchema, readerPreferencesSchema, readingPositionsSchema, searchHistorySchema, viewHistorySchema } from './schemas'

export const libraryStore = createBrowserStore<Library>('library', librarySchema, emptyLibrary)
export const viewHistoryStore = createBrowserStore<ViewHistory>('view-history', viewHistorySchema, emptyViewHistory)
export const searchHistoryStore = createBrowserStore<string[]>('search-history', searchHistorySchema, (): string[] => [])
export const readingPositionsStore = createBrowserStore<ReadingPositions>('reading-positions', readingPositionsSchema, emptyReadingPositions)
export const readerPreferencesStore = createBrowserStore<ReaderPreferences>('reader-preferences', readerPreferencesSchema, () => ({ ...DEFAULT_READER_PREFERENCES }))
export const consentStore = createBrowserStore<AnalyticsConsent>('analytics-consent', consentSchema, emptyConsent)
