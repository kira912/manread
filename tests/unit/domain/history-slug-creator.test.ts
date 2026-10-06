import { describe, expect, it } from 'vitest'
import { classifyCreatorRole, principalCredits } from '#shared/domain/creator'
import { emptyViewHistory, forgetView, recordSearchTerm, recordView, SEARCH_HISTORY_CAPACITY, VIEW_HISTORY_CAPACITY } from '#shared/domain/history'
import { shortSynopsis } from '#shared/domain/manga'
import { slugify } from '#shared/domain/slug'
import { buildSnapshot } from '../../support/builders'

describe('history', () => {
  it('moves re-viewed titles to the top and caps size', () => {
    let history = emptyViewHistory()
    for (let index = 0; index < VIEW_HISTORY_CAPACITY + 5; index += 1) {
      history = recordView(history, buildSnapshot({ id: String(index) }), new Date(index * 1000).toISOString())
    }
    history = recordView(history, buildSnapshot({ id: '10' }), new Date().toISOString())
    expect(history.entries).toHaveLength(VIEW_HISTORY_CAPACITY)
    expect(history.entries[0]?.manga.id).toBe('10')
    expect(history.entries.filter(entry => entry.manga.id === '10')).toHaveLength(1)
    expect(forgetView(history, '10').entries.some(entry => entry.manga.id === '10')).toBe(false)
  })

  it('records search terms case-insensitively, newest first', () => {
    let terms: string[] = []
    terms = recordSearchTerm(terms, 'Berserk')
    terms = recordSearchTerm(terms, '  one   piece ')
    terms = recordSearchTerm(terms, 'berserk')
    expect(terms).toEqual(['berserk', 'one piece'])
    expect(recordSearchTerm(terms, '   ')).toEqual(terms)
    const many = Array.from({ length: 20 }, (_, index) => `t${index}`).reduce(recordSearchTerm, [] as string[])
    expect(many).toHaveLength(SEARCH_HISTORY_CAPACITY)
  })
})

describe('slugify', () => {
  it.each([
    ['Frieren: Beyond Journey’s End', 'frieren-beyond-journeys-end'],
    ['Pokémon Adventures', 'pokemon-adventures'],
    ['葬送のフリーレン', 'untitled'],
    ['--Hello   World--', 'hello-world'],
  ])('slugifies %s', (input, expected) => {
    expect(slugify(input)).toBe(expected)
  })
})

describe('creators', () => {
  it.each([
    ['Story & Art', 'story_art'],
    ['Original Story', 'story'],
    ['Art', 'art'],
    ['Assistant', 'other'],
  ] as const)('classifies %s', (role, expected) => {
    expect(classifyCreatorRole(role)).toBe(expected)
  })

  it('orders principal credits and drops other roles', () => {
    const credit = (role: 'story' | 'art' | 'other') => ({ creatorId: role, slug: role, name: role, role, roleLabel: role, image: null })
    expect(principalCredits([credit('art'), credit('other'), credit('story')]).map(entry => entry.role)).toEqual(['story', 'art'])
  })
})

describe('shortSynopsis', () => {
  it('cuts on a word boundary', () => {
    expect(shortSynopsis(['one two three four'], 10)).toBe('one two…')
    expect(shortSynopsis(['short'], 10)).toBe('short')
  })
})
