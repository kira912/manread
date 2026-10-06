import { describe, expect, it } from 'vitest'
import { COVER_PLACEHOLDER, mapCreator, mapMediaDetail, mapSummaries, mapSummary } from '../../../server/infrastructure/providers/anilist/mapper'
import { rawMedia, rawMediaDetail } from '../../support/anilist-fixtures'
import { RecordingMetrics, silentLogger } from '../../support/fakes'

const context = () => ({ logger: silentLogger, metrics: new RecordingMetrics() })

describe('AniList mapper', () => {
  it('maps a summary into the domain model', () => {
    expect(mapSummary(rawMedia(), context())).toEqual({
      id: '30013',
      slug: 'one-piece',
      title: 'One Piece',
      nativeTitle: 'ONE PIECE',
      cover: {
        small: 'https://s4.anilist.co/file/small.jpg',
        medium: 'https://s4.anilist.co/file/medium.jpg',
        large: 'https://s4.anilist.co/file/large.jpg',
        dominantColor: '#e4a15d',
      },
      status: 'releasing',
      format: 'serial',
      origin: 'JP',
      startYear: 1997,
      genres: ['Action', 'Adventure'],
      score: 91,
      popularity: 234_000,
      favourites: 90_000,
      chapters: null,
    })
  })

  it('excludes adult titles and unsupported origins', () => {
    expect(mapSummary(rawMedia({ isAdult: true }), context())).toBeNull()
    expect(mapSummary(rawMedia({ countryOfOrigin: 'US' }), context())).toBeNull()
  })

  it('drops invalid items without failing the list', () => {
    const ctx = context()
    const items = mapSummaries([rawMedia(), { id: 'not-a-number' }, null, rawMedia({ id: 2 })], ctx)
    expect(items.map(item => item.id)).toEqual(['30013', '2'])
    expect(ctx.metrics.counters.get('provider_invalid_item:anilist,media_summary')).toBe(2)
  })

  it('refuses images served from unexpected hosts', () => {
    const manga = mapSummary(
      rawMedia({ coverImage: { medium: 'https://evil.example.com/x.jpg', large: 'javascript:alert(1)', extraLarge: null, color: 'red;}' } }),
      context(),
    )
    expect(manga?.cover).toEqual({ small: COVER_PLACEHOLDER, medium: COVER_PLACEHOLDER, large: COVER_PLACEHOLDER, dominantColor: null })
  })

  it('maps details, sanitising text and filtering links, tags and relations', () => {
    const result = mapMediaDetail(rawMediaDetail(), context())
    expect(result?.manga.synopsis).toEqual(['As a child, Luffy & friends...', '(Source: VIZ Media)'])
    expect(result?.manga.alternativeTitles).toEqual(['원피스'])
    expect(result?.manga.tags).toEqual([{ name: 'Pirates', rank: 95 }])
    expect(result?.manga.credits.map(credit => [credit.name, credit.role, credit.roleLabel])).toEqual([
      ['Eiichirou Oda', 'story_art', 'Story & Art'],
      ['Helper', 'other', 'Assistant'],
    ])
    expect(result?.manga.relations.map(relation => [relation.kind, relation.manga.title])).toEqual([['Side story', 'Romance Dawn']])
    expect(result?.manga.startDate).toBe('1997-07-22')
    expect(result?.availability).toEqual([
      {
        platformId: 'manga-plus',
        platformName: 'MANGA Plus',
        url: 'https://mangaplus.shueisha.co.jp/titles/100020',
        language: 'English',
        sourceProvider: 'anilist',
      },
    ])
  })

  it('maps creators and strips AniList markup', () => {
    const creator = mapCreator(
      {
        id: 96881,
        name: { full: 'Eiichirou Oda', native: '尾田栄一郎' },
        image: { large: 'https://s4.anilist.co/oda.png' },
        description: '__Born__: 1975 ~!spoiler!~ [link](https://x.y)',
        staffMedia: { edges: [{ staffRole: 'Story & Art', node: rawMedia() }, { staffRole: 'Art', node: rawMedia() }] },
      },
      context(),
    )
    expect(creator?.biography).toEqual(['Born: 1975 link'])
    expect(creator?.works).toHaveLength(1)
  })
})
