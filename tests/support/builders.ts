import type { Availability } from '#shared/domain/availability'
import type { MangaSnapshot } from '#shared/domain/library'
import type { Manga, MangaSummary } from '#shared/domain/manga'

export function buildSummary(overrides: Partial<MangaSummary> = {}): MangaSummary {
  return {
    id: '1',
    slug: 'test-title',
    title: 'Test Title',
    nativeTitle: null,
    cover: { small: 'https://s4.anilist.co/s.jpg', medium: 'https://s4.anilist.co/m.jpg', large: 'https://s4.anilist.co/l.jpg', dominantColor: '#123456' },
    status: 'releasing',
    format: 'serial',
    origin: 'JP',
    startYear: 2020,
    genres: ['Drama'],
    score: 80,
    popularity: 1000,
    favourites: 100,
    chapters: null,
    ...overrides,
  }
}

export function buildManga(overrides: Partial<Manga> = {}): Manga {
  return {
    ...buildSummary(),
    alternativeTitles: [],
    synopsis: ['A synopsis.'],
    bannerImage: null,
    volumes: null,
    endYear: null,
    startDate: '2020',
    tags: [],
    credits: [],
    relations: [],
    updatedAt: null,
    ...overrides,
  }
}

export function buildSnapshot(overrides: Partial<MangaSnapshot> = {}): MangaSnapshot {
  return {
    id: '1',
    slug: 'test-title',
    title: 'Test Title',
    coverMedium: 'https://s4.anilist.co/m.jpg',
    coverLarge: 'https://s4.anilist.co/l.jpg',
    dominantColor: null,
    origin: 'JP',
    status: 'finished',
    chapters: 100,
    ...overrides,
  }
}

export function buildAvailability(overrides: Partial<Availability> = {}): Availability {
  return {
    platformId: 'manga-plus',
    platformName: 'MANGA Plus',
    url: 'https://mangaplus.shueisha.co.jp/titles/1',
    language: 'English',
    sourceProvider: 'test',
    ...overrides,
  }
}
