import type { Availability } from './availability'
import type { CreatorCredit } from './creator'

export const MANGA_STATUSES = ['releasing', 'finished', 'hiatus', 'cancelled', 'upcoming'] as const
export type MangaStatus = (typeof MANGA_STATUSES)[number]

export const MANGA_FORMATS = ['serial', 'one_shot'] as const
export type MangaFormat = (typeof MANGA_FORMATS)[number]

export const MANGA_ORIGINS = ['JP', 'KR', 'CN', 'TW'] as const
export type MangaOrigin = (typeof MANGA_ORIGINS)[number]

export type MangaId = string

export const COVER_WIDTHS = { small: 100, medium: 230, large: 460 } as const
export const COVER_ASPECT_RATIO = 0.7
export const COVER_RENDER_WIDTHS = [120, 180, 240, 320, 400, COVER_WIDTHS.large] as const

export interface CoverImage {
  readonly small: string
  readonly medium: string
  readonly large: string
  readonly dominantColor: string | null
}

export interface MangaSummary {
  readonly id: MangaId
  readonly slug: string
  readonly title: string
  readonly nativeTitle: string | null
  readonly cover: CoverImage
  readonly status: MangaStatus
  readonly format: MangaFormat
  readonly origin: MangaOrigin
  readonly startYear: number | null
  readonly genres: readonly string[]
  readonly score: number | null
  readonly popularity: number
  readonly favourites: number
  readonly chapters: number | null
}

export interface MangaTag {
  readonly name: string
  readonly rank: number
}

export interface MangaRelation {
  readonly kind: string
  readonly manga: MangaSummary
}

export interface Manga extends MangaSummary {
  readonly alternativeTitles: readonly string[]
  readonly synopsis: readonly string[]
  readonly bannerImage: string | null
  readonly volumes: number | null
  readonly endYear: number | null
  readonly startDate: string | null
  readonly tags: readonly MangaTag[]
  readonly credits: readonly CreatorCredit[]
  readonly relations: readonly MangaRelation[]
  readonly updatedAt: string | null
}

export interface MangaDetails {
  readonly manga: Manga
  readonly availability: readonly Availability[]
  readonly availabilityDegraded: boolean
}

const STATUS_LABELS: Record<MangaStatus, string> = {
  releasing: 'Ongoing',
  finished: 'Completed',
  hiatus: 'On hiatus',
  cancelled: 'Cancelled',
  upcoming: 'Upcoming',
}

const ORIGIN_LABELS: Record<MangaOrigin, string> = {
  JP: 'Manga',
  KR: 'Manhwa',
  CN: 'Manhua',
  TW: 'Manhua',
}

const ORIGIN_LANGUAGES: Record<MangaOrigin, string> = {
  JP: 'ja',
  KR: 'ko',
  CN: 'zh-Hans',
  TW: 'zh-Hant',
}

export function originLanguage(origin: MangaOrigin): string {
  return ORIGIN_LANGUAGES[origin]
}

export function statusLabel(status: MangaStatus): string {
  return STATUS_LABELS[status]
}

export function originLabel(origin: MangaOrigin): string {
  return ORIGIN_LABELS[origin]
}

export function isMangaStatus(value: unknown): value is MangaStatus {
  return typeof value === 'string' && (MANGA_STATUSES as readonly string[]).includes(value)
}

export function isMangaOrigin(value: unknown): value is MangaOrigin {
  return typeof value === 'string' && (MANGA_ORIGINS as readonly string[]).includes(value)
}

export function mangaPath(manga: Pick<MangaSummary, 'id' | 'slug'>): string {
  return `/manga/${manga.id}/${manga.slug}`
}

export function chapterCountLabel(manga: Pick<MangaSummary, 'chapters' | 'status'>): string {
  if (manga.chapters !== null) return `${manga.chapters} ch.`
  return manga.status === 'releasing' ? 'Ongoing' : '—'
}

export function shortSynopsis(paragraphs: readonly string[], maxLength: number): string {
  const text = paragraphs.join(' ')
  if (text.length <= maxLength) return text
  const cut = text.slice(0, maxLength)
  const lastSpace = cut.lastIndexOf(' ')
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : maxLength).trimEnd()}…`
}
