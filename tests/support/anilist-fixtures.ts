export function rawMedia(overrides: Record<string, unknown> = {}) {
  return {
    id: 30013,
    title: { romaji: 'ONE PIECE', english: 'One Piece', native: 'ONE PIECE' },
    coverImage: {
      medium: 'https://s4.anilist.co/file/small.jpg',
      large: 'https://s4.anilist.co/file/medium.jpg',
      extraLarge: 'https://s4.anilist.co/file/large.jpg',
      color: '#e4a15d',
    },
    status: 'RELEASING',
    format: 'MANGA',
    countryOfOrigin: 'JP',
    startDate: { year: 1997, month: 7, day: 22 },
    genres: ['Action', 'Adventure'],
    averageScore: 91,
    popularity: 234_000,
    favourites: 90_000,
    chapters: null,
    isAdult: false,
    ...overrides,
  }
}

export function rawMediaDetail(overrides: Record<string, unknown> = {}) {
  return {
    ...rawMedia(),
    synonyms: ['원피스', 'One Piece'],
    description: 'As a child, <i>Luffy</i> &amp; friends...<br><br>(Source: VIZ Media)',
    bannerImage: 'https://s4.anilist.co/file/banner.jpg',
    volumes: null,
    updatedAt: 1_700_000_000,
    endDate: { year: null },
    tags: [
      { name: 'Pirates', rank: 95, isMediaSpoiler: false, isAdult: false },
      { name: 'Secret', rank: 90, isMediaSpoiler: true, isAdult: false },
      { name: 'Low', rank: 20, isMediaSpoiler: false, isAdult: false },
    ],
    staff: {
      edges: [
        { role: 'Story & Art', node: { id: 96881, name: { full: 'Eiichirou Oda', native: '尾田栄一郎' }, image: { medium: 'https://s4.anilist.co/oda.png' } } },
        { role: 'Assistant (vol 1)', node: { id: 2, name: { full: 'Helper', native: null }, image: null } },
      ],
    },
    relations: {
      edges: [
        { relationType: 'SIDE_STORY', node: { ...rawMedia({ id: 1, title: { romaji: 'Romance Dawn', english: null, native: null } }), type: 'MANGA' } },
        { relationType: 'ADAPTATION', node: { ...rawMedia({ id: 21 }), type: 'ANIME' } },
      ],
    },
    externalLinks: [
      { id: 1, site: 'MANGA Plus', siteId: 42, url: 'https://mangaplus.shueisha.co.jp/titles/100020', type: 'STREAMING', language: 'English', isDisabled: false },
      { id: 2, site: 'Twitter', siteId: 17, url: 'https://twitter.com/x', type: 'SOCIAL', language: null, isDisabled: false },
      { id: 3, site: 'Shady', siteId: 99, url: 'http://insecure.example.com', type: 'STREAMING', language: 'English', isDisabled: false },
      { id: 4, site: 'Old', siteId: 98, url: 'https://old.example.com', type: 'STREAMING', language: 'English', isDisabled: true },
      { id: 5, site: 'Local', siteId: 97, url: 'https://localhost/admin', type: 'STREAMING', language: 'English', isDisabled: false },
    ],
    ...overrides,
  }
}
