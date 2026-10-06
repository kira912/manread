import { z } from 'zod'
import { MANGA_ORIGINS, MANGA_STATUSES } from './manga'

export const SEARCH_SORTS = ['relevance', 'popularity', 'score', 'trending', 'newest', 'title'] as const
export type SearchSort = (typeof SEARCH_SORTS)[number]

export const SEARCH_LIMITS = {
  maxTextLength: 100,
  maxGenres: 6,
  maxPlatforms: 8,
  maxLanguages: 4,
  maxPage: 50,
  minYear: 1940,
} as const

export interface SearchQuery {
  readonly text: string
  readonly genres: readonly string[]
  readonly status: (typeof MANGA_STATUSES)[number] | null
  readonly origin: (typeof MANGA_ORIGINS)[number] | null
  readonly yearFrom: number | null
  readonly yearTo: number | null
  readonly platformIds: readonly string[]
  readonly languages: readonly string[]
  readonly readableOnly: boolean
  readonly sort: SearchSort
  readonly page: number
}

export interface Page<T> {
  readonly items: readonly T[]
  readonly page: number
  readonly hasNextPage: boolean
  readonly total: number | null
}

export const EMPTY_SEARCH_QUERY: SearchQuery = {
  text: '',
  genres: [],
  status: null,
  origin: null,
  yearFrom: null,
  yearTo: null,
  platformIds: [],
  languages: [],
  readableOnly: false,
  sort: 'relevance',
  page: 1,
}

const currentYear = () => new Date().getUTCFullYear()

const listParam = (maxItems: number, itemPattern: RegExp) =>
  z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform(value => {
      const raw = value === undefined ? [] : Array.isArray(value) ? value : value.split(',')
      return [...new Set(raw.map(item => item.trim()).filter(item => itemPattern.test(item)))].slice(0, maxItems)
    })

const yearParam = z.coerce
  .number()
  .int()
  .min(SEARCH_LIMITS.minYear)
  .refine(year => year <= currentYear() + 1, 'Year is in the future')
  .optional()
  .catch(undefined)

export const searchQuerySchema = z
  .object({
    q: z.string().trim().max(SEARCH_LIMITS.maxTextLength).optional().catch(undefined),
    genre: listParam(SEARCH_LIMITS.maxGenres, /^[\p{L}\p{N} '\-]{1,40}$/u),
    status: z.enum(MANGA_STATUSES).optional().catch(undefined),
    origin: z.enum(MANGA_ORIGINS).optional().catch(undefined),
    from: yearParam,
    to: yearParam,
    platform: listParam(SEARCH_LIMITS.maxPlatforms, /^[a-z0-9-]{1,60}$/),
    lang: listParam(SEARCH_LIMITS.maxLanguages, /^[\p{L} ]{2,30}$/u),
    readable: z
      .union([z.literal('1'), z.literal('true'), z.literal('0'), z.literal('false')])
      .optional()
      .catch(undefined),
    sort: z.enum(SEARCH_SORTS).optional().catch(undefined),
    page: z.coerce.number().int().min(1).max(SEARCH_LIMITS.maxPage).optional().catch(undefined),
  })
  .transform((params): SearchQuery => {
    const [yearFrom, yearTo] = orderedRange(params.from ?? null, params.to ?? null)
    const text = params.q ?? ''
    return {
      text,
      genres: params.genre,
      status: params.status ?? null,
      origin: params.origin ?? null,
      yearFrom,
      yearTo,
      platformIds: params.platform,
      languages: params.lang,
      readableOnly: params.readable === '1' || params.readable === 'true',
      sort: params.sort ?? (text ? 'relevance' : 'popularity'),
      page: params.page ?? 1,
    }
  })

export type SearchUrlParams = Partial<Record<'q' | 'genre' | 'status' | 'origin' | 'from' | 'to' | 'platform' | 'lang' | 'readable' | 'sort' | 'page', string>>

export function parseSearchQuery(params: Record<string, unknown>): SearchQuery {
  const result = searchQuerySchema.safeParse(params)
  return result.success ? result.data : EMPTY_SEARCH_QUERY
}

export function toSearchUrlParams(query: SearchQuery): SearchUrlParams {
  const params: SearchUrlParams = {}
  if (query.text) params.q = query.text
  if (query.genres.length) params.genre = query.genres.join(',')
  if (query.status) params.status = query.status
  if (query.origin) params.origin = query.origin
  if (query.yearFrom !== null) params.from = String(query.yearFrom)
  if (query.yearTo !== null) params.to = String(query.yearTo)
  if (query.platformIds.length) params.platform = query.platformIds.join(',')
  if (query.languages.length) params.lang = query.languages.join(',')
  if (query.readableOnly) params.readable = '1'
  if (query.sort !== defaultSort(query.text)) params.sort = query.sort
  if (query.page > 1) params.page = String(query.page)
  return params
}

export function hasSearchCriteria(query: SearchQuery): boolean {
  return (
    query.text.length > 0 ||
    query.genres.length > 0 ||
    query.status !== null ||
    query.origin !== null ||
    query.yearFrom !== null ||
    query.yearTo !== null ||
    query.platformIds.length > 0 ||
    query.languages.length > 0 ||
    query.readableOnly
  )
}

export function activeFilterCount(query: SearchQuery): number {
  return (
    query.genres.length +
    query.platformIds.length +
    query.languages.length +
    Number(query.status !== null) +
    Number(query.origin !== null) +
    Number(query.yearFrom !== null || query.yearTo !== null) +
    Number(query.readableOnly)
  )
}

export function searchCacheKey(query: SearchQuery): string {
  const params = toSearchUrlParams({ ...query, text: query.text.toLowerCase() })
  return Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&')
}

function defaultSort(text: string): SearchSort {
  return text ? 'relevance' : 'popularity'
}

function orderedRange(from: number | null, to: number | null): [number | null, number | null] {
  if (from !== null && to !== null && from > to) return [to, from]
  return [from, to]
}
