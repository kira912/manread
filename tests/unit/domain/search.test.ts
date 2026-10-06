import { describe, expect, it } from 'vitest'
import {
  activeFilterCount,
  EMPTY_SEARCH_QUERY,
  hasSearchCriteria,
  parseSearchQuery,
  searchCacheKey,
  SEARCH_LIMITS,
  toSearchUrlParams,
} from '#shared/domain/search'

describe('search query', () => {
  it('parses a full set of URL params', () => {
    const query = parseSearchQuery({
      q: '  frieren ',
      genre: 'Drama,Fantasy',
      status: 'releasing',
      origin: 'JP',
      from: '2010',
      to: '2020',
      platform: 'manga-plus,viz',
      lang: 'English',
      readable: '1',
      sort: 'score',
      page: '2',
    })
    expect(query).toEqual({
      text: 'frieren',
      genres: ['Drama', 'Fantasy'],
      status: 'releasing',
      origin: 'JP',
      yearFrom: 2010,
      yearTo: 2020,
      platformIds: ['manga-plus', 'viz'],
      languages: ['English'],
      readableOnly: true,
      sort: 'score',
      page: 2,
    })
  })

  it('drops invalid values instead of failing the whole query', () => {
    const query = parseSearchQuery({ q: 'ok', status: 'bogus', origin: 'FR', from: 'abc', page: '-4', sort: 'nope', genre: '<script>' })
    expect(query).toMatchObject({ text: 'ok', status: null, origin: null, yearFrom: null, page: 1, sort: 'relevance', genres: [] })
  })

  it('caps list sizes and deduplicates values', () => {
    const genres = Array.from({ length: 20 }, (_, index) => `Genre ${index}`)
    const query = parseSearchQuery({ genre: [...genres, 'Genre 0'] })
    expect(query.genres).toHaveLength(SEARCH_LIMITS.maxGenres)
  })

  it('orders an inverted year range', () => {
    expect(parseSearchQuery({ from: '2020', to: '2001' })).toMatchObject({ yearFrom: 2001, yearTo: 2020 })
  })

  it('rejects overly long text', () => {
    expect(parseSearchQuery({ q: 'x'.repeat(SEARCH_LIMITS.maxTextLength + 1) }).text).toBe('')
  })

  it('defaults to relevance with text and popularity without', () => {
    expect(parseSearchQuery({ q: 'a' }).sort).toBe('relevance')
    expect(parseSearchQuery({}).sort).toBe('popularity')
  })

  it('round-trips through URL params and omits defaults', () => {
    const query = parseSearchQuery({ q: 'berserk', genre: 'Action', readable: 'true' })
    const params = toSearchUrlParams(query)
    expect(params).toEqual({ q: 'berserk', genre: 'Action', readable: '1' })
    expect(parseSearchQuery(params)).toEqual(query)
  })

  it('produces stable cache keys regardless of param order and case', () => {
    const a = parseSearchQuery({ q: 'Frieren', genre: 'Drama' })
    const b = parseSearchQuery({ genre: 'Drama', q: 'frieren' })
    expect(searchCacheKey(a)).toBe(searchCacheKey(b))
  })

  it('counts active filters', () => {
    expect(hasSearchCriteria(EMPTY_SEARCH_QUERY)).toBe(false)
    expect(activeFilterCount(parseSearchQuery({ genre: 'A,B', from: '2000', to: '2001', readable: '1' }))).toBe(4)
  })
})
