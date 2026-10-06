export const HTTP_CACHE_SECONDS = {
  home: { maxAge: 60, sMaxAge: 300, staleWhileRevalidate: 3600 },
  search: { maxAge: 60, sMaxAge: 300, staleWhileRevalidate: 1800 },
  manga: { maxAge: 300, sMaxAge: 1800, staleWhileRevalidate: 21_600 },
  chapters: { maxAge: 60, sMaxAge: 300, staleWhileRevalidate: 3600 },
  facets: { maxAge: 3600, sMaxAge: 86_400, staleWhileRevalidate: 604_800 },
} as const
