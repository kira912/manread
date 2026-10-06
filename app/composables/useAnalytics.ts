import { track as trackWithVercel } from '@vercel/analytics'
import type { ReadingStatus } from '#shared/domain/library'

type EventValue = string | number | boolean | null

export interface AnalyticsEvents {
  search: { source: 'palette' | 'page'; term: string }
  search_no_results: { term: string }
  library_add: { status: ReadingStatus; manga: string }
  favorite: { enabled: boolean; manga: string }
  reader_open: { manga: string; chapter: number }
  chapter_complete: { manga: string; chapter: number }
  outbound_platform: { platform: string; manga: string }
}

interface UmamiTracker {
  track(name: string, data?: Record<string, EventValue>): void
}

declare global {
  interface Window {
    umami?: UmamiTracker
  }
}

const MAX_TEXT_LENGTH = 60

export function trackEvent<Name extends keyof AnalyticsEvents>(name: Name, properties: AnalyticsEvents[Name]): void {
  if (import.meta.server) return
  const payload = sanitize(properties)
  try {
    window.umami?.track(name, payload)
    trackWithVercel(name, payload)
  } catch (error) {
    console.warn('[analytics] event dropped', name, error)
  }
}

function sanitize(properties: object): Record<string, EventValue> {
  return Object.fromEntries(
    Object.entries(properties).map(([key, value]) => [key, typeof value === 'string' ? value.trim().slice(0, MAX_TEXT_LENGTH) : (value as EventValue)]),
  )
}
