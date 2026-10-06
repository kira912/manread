import { originLabel, statusLabel, type MangaSummary } from '#shared/domain/manga'
import { genreLabel } from '#shared/domain/labels'

const compactFormatter = new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 })
const relativeFormatter = new Intl.RelativeTimeFormat('fr-FR', { numeric: 'auto' })
const SCORE_SCALE = 10
const scoreFormatter = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

const RELATIVE_UNITS: readonly [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31_536_000],
  ['month', 2_592_000],
  ['week', 604_800],
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60],
]

export function compactNumber(value: number): string {
  return compactFormatter.format(value)
}

export function formatScore(score: number | null): string | null {
  return score === null ? null : scoreFormatter.format(score / SCORE_SCALE)
}

export function metaLine(manga: Pick<MangaSummary, 'origin' | 'startYear' | 'status'>): string {
  return [originLabel(manga.origin), manga.startYear, statusLabel(manga.status)].filter(Boolean).join(' · ')
}

export function indexLabel(index: number): string {
  return String(index + 1).padStart(2, '0')
}

export function relativeTime(iso: string, now = Date.now()): string {
  const seconds = Math.round((Date.parse(iso) - now) / 1000)
  for (const [unit, unitSeconds] of RELATIVE_UNITS) {
    if (Math.abs(seconds) >= unitSeconds) return relativeFormatter.format(Math.round(seconds / unitSeconds), unit)
  }
  return 'à l’instant'
}

export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count <= 1 ? singular : pluralForm}`
}

export function genreList(genres: readonly string[], limit: number, separator = ' / '): string {
  return genres.slice(0, limit).map(genreLabel).join(separator)
}
