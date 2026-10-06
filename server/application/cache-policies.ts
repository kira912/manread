import type { CachePolicy } from './ports'

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

export const CACHE_POLICIES = {
  search: { freshMs: 5 * MINUTE, staleMs: 30 * MINUTE },
  instantSearch: { freshMs: 10 * MINUTE, staleMs: 1 * HOUR },
  mangaDetails: { freshMs: 30 * MINUTE, staleMs: 6 * HOUR },
  rawMedia: { freshMs: 10 * MINUTE, staleMs: 1 * HOUR },
  availability: { freshMs: 6 * HOUR, staleMs: 1 * DAY },
  missing: { freshMs: 1 * MINUTE, staleMs: 0 },
  home: { freshMs: 10 * MINUTE, staleMs: 2 * HOUR },
  recommendations: { freshMs: 6 * HOUR, staleMs: 1 * DAY },
  creator: { freshMs: 1 * DAY, staleMs: 3 * DAY },
  facets: { freshMs: 1 * DAY, staleMs: 7 * DAY },
  contentManifests: { freshMs: 1 * MINUTE, staleMs: 10 * MINUTE },
  sitemap: { freshMs: 1 * DAY, staleMs: 2 * DAY },
} as const satisfies Record<string, CachePolicy>
