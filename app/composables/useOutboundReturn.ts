import type { MangaId } from '#shared/domain/manga'

const STORAGE_KEY = 'manread:outbound'
const MIN_AWAY_MS = 20_000
const MAX_AWAY_MS = 6 * 60 * 60 * 1000

interface PendingReturn {
  readonly mangaId: MangaId
  readonly title: string
  readonly platformName: string
  readonly nextChapter: number
  readonly leftAt: number
}

export interface OfficialPlatformVisit {
  readonly mangaId: MangaId
  readonly title: string
  readonly platformName: string
  readonly nextChapter: number | null
}

export function openOfficialPlatform(visit: OfficialPlatformVisit) {
  trackEvent('outbound_platform', { platform: visit.platformName, manga: visit.title })
  if (visit.nextChapter !== null) {
    rememberOutbound({ mangaId: visit.mangaId, title: visit.title, platformName: visit.platformName, nextChapter: visit.nextChapter })
  }
}

export function rememberOutbound(visit: Omit<PendingReturn, 'leftAt'>) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...visit, leftAt: Date.now() }))
  } catch (error) {
    console.warn('[outbound] could not remember the visit', error)
  }
}

export function takePendingReturn(now = Date.now()): PendingReturn | null {
  let raw: string | null
  try {
    raw = sessionStorage.getItem(STORAGE_KEY)
    sessionStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.warn('[outbound] session storage unavailable', error)
    return null
  }
  if (!raw) return null
  const pending = parsePending(raw)
  if (!pending) return null
  const away = now - pending.leftAt
  return away >= MIN_AWAY_MS && away <= MAX_AWAY_MS ? pending : null
}

function parsePending(raw: string): PendingReturn | null {
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch (error) {
    console.warn('[outbound] corrupted pending visit', error)
    return null
  }
  if (!value || typeof value !== 'object') return null
  const candidate = value as Record<string, unknown>
  const valid =
    typeof candidate.mangaId === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.platformName === 'string' &&
    Number.isInteger(candidate.nextChapter) &&
    (candidate.nextChapter as number) > 0 &&
    typeof candidate.leftAt === 'number'
  return valid ? (candidate as unknown as PendingReturn) : null
}
