import { describe, expect, it } from 'vitest'
import { LibraryInvariantError } from '#shared/domain/errors'
import {
  continueReading,
  emptyLibrary,
  libraryStats,
  mergeLibraries,
  progressRatio,
  queryLibrary,
  recommendationSeed,
  recordProgress,
  refreshSnapshot,
  removeEntry,
  setFavorite,
  setPreferredPlatform,
  setStatus,
  toSnapshot,
} from '#shared/domain/library'
import { buildSnapshot, buildSummary } from '../../support/builders'

const T0 = '2026-01-01T00:00:00.000Z'
const T1 = '2026-01-02T00:00:00.000Z'
const T2 = '2026-01-03T00:00:00.000Z'

describe('library', () => {
  it('adds an entry with the requested status', () => {
    const library = setStatus(emptyLibrary(), buildSnapshot(), 'reading', T0)
    expect(library.entries['1']).toMatchObject({ status: 'reading', chapter: 0, favorite: false, addedAt: T0, updatedAt: T0 })
  })

  it('jumps progress to the last chapter when marked completed', () => {
    const library = setStatus(emptyLibrary(), buildSnapshot({ chapters: 42 }), 'completed', T0)
    expect(library.entries['1']?.chapter).toBe(42)
  })

  it('keeps the original added date when the status changes', () => {
    const first = setStatus(emptyLibrary(), buildSnapshot(), 'plan_to_read', T0)
    const second = setStatus(first, buildSnapshot(), 'reading', T1)
    expect(second.entries['1']).toMatchObject({ addedAt: T0, updatedAt: T1, status: 'reading' })
  })

  it('never mutates the previous state', () => {
    const before = emptyLibrary()
    setStatus(before, buildSnapshot(), 'reading', T0)
    expect(before.entries).toEqual({})
  })

  it('creates a plan-to-read entry when favoriting an unknown title', () => {
    const library = setFavorite(emptyLibrary(), buildSnapshot(), true, T0)
    expect(library.entries['1']).toMatchObject({ favorite: true, status: 'plan_to_read' })
  })

  describe('recordProgress', () => {
    const base = setStatus(emptyLibrary(), buildSnapshot({ chapters: 10, status: 'finished' }), 'plan_to_read', T0)

    it('moves a planned title to reading once a chapter is read', () => {
      expect(recordProgress(base, '1', 3, T1).entries['1']).toMatchObject({ chapter: 3, status: 'reading' })
    })

    it('completes a finished series when the last chapter is reached', () => {
      expect(recordProgress(base, '1', 10, T1).entries['1']?.status).toBe('completed')
    })

    it('reopens a completed title when progress goes backwards', () => {
      const completed = setStatus(base, buildSnapshot({ chapters: 10, status: 'finished' }), 'completed', T1)
      expect(recordProgress(completed, '1', 4, T2).entries['1']?.status).toBe('reading')
    })

    it('does not complete an ongoing series', () => {
      const ongoing = setStatus(emptyLibrary(), buildSnapshot({ chapters: null, status: 'releasing' }), 'reading', T0)
      expect(recordProgress(ongoing, '1', 500, T1).entries['1']?.status).toBe('reading')
    })

    it.each([-1, 1.5, 11])('rejects invalid chapter %s', chapter => {
      expect(() => recordProgress(base, '1', chapter, T1)).toThrow(LibraryInvariantError)
    })

    it('rejects progress on a title outside the library', () => {
      expect(() => recordProgress(emptyLibrary(), '404', 1, T1)).toThrow(LibraryInvariantError)
    })
  })

  it('remembers the preferred platform only for saved titles', () => {
    const platform = { id: 'viz', name: 'VIZ', url: 'https://www.viz.com/x' }
    expect(setPreferredPlatform(emptyLibrary(), '1', platform, T0)).toEqual(emptyLibrary())
    const saved = setStatus(emptyLibrary(), buildSnapshot(), 'reading', T0)
    expect(setPreferredPlatform(saved, '1', platform, T1).entries['1']?.preferredPlatform).toEqual(platform)
  })

  it('removes entries and ignores unknown ids', () => {
    const library = setStatus(emptyLibrary(), buildSnapshot(), 'reading', T0)
    expect(removeEntry(library, '1').entries).toEqual({})
    expect(removeEntry(library, 'unknown')).toBe(library)
  })

  it('refreshes cached metadata without touching user data', () => {
    const library = setStatus(emptyLibrary(), buildSnapshot({ title: 'Old' }), 'reading', T0)
    const refreshed = refreshSnapshot(library, buildSnapshot({ title: 'New' }))
    expect(refreshed.entries['1']).toMatchObject({ status: 'reading', updatedAt: T0, manga: { title: 'New' } })
    expect(refreshSnapshot(refreshed, buildSnapshot({ title: 'New' }))).toBe(refreshed)
  })

  describe('queries', () => {
    let library = emptyLibrary()
    library = setStatus(library, buildSnapshot({ id: 'a', title: 'Berserk' }), 'reading', T0)
    library = setStatus(library, buildSnapshot({ id: 'b', title: 'Akira' }), 'completed', T1)
    library = setFavorite(library, buildSnapshot({ id: 'c', title: 'Monster' }), true, T2)

    it('filters by view and text', () => {
      expect(queryLibrary(library, { view: 'all', text: '', sort: 'title' }).map(entry => entry.manga.id)).toEqual(['b', 'a', 'c'])
      expect(queryLibrary(library, { view: 'favorites', text: '', sort: 'updated' }).map(entry => entry.manga.id)).toEqual(['c'])
      expect(queryLibrary(library, { view: 'all', text: 'MON', sort: 'updated' }).map(entry => entry.manga.id)).toEqual(['c'])
    })

    it('sorts by most recent update', () => {
      expect(queryLibrary(library, { view: 'all', text: '', sort: 'updated' }).map(entry => entry.manga.id)).toEqual(['c', 'b', 'a'])
    })

    it('computes stats per view', () => {
      expect(libraryStats(library)).toMatchObject({ all: 3, reading: 1, completed: 1, plan_to_read: 1, favorites: 1 })
    })

    it('lists titles to continue and picks a recommendation seed', () => {
      expect(continueReading(library, 5).map(entry => entry.manga.id)).toEqual(['a'])
      expect(recommendationSeed(library)?.manga.id).toBe('c')
    })
  })

  it('computes progress ratio only when length is known', () => {
    const known = setStatus(emptyLibrary(), buildSnapshot({ chapters: 4 }), 'reading', T0)
    const withProgress = recordProgress(known, '1', 1, T1)
    expect(progressRatio(withProgress.entries['1']!)).toBe(0.25)
    const unknown = setStatus(emptyLibrary(), buildSnapshot({ chapters: null }), 'reading', T0)
    expect(progressRatio(unknown.entries['1']!)).toBeNull()
  })

  it('merges imports, keeping the most recently updated entry', () => {
    const local = setStatus(setStatus(emptyLibrary(), buildSnapshot({ id: 'a' }), 'reading', T1), buildSnapshot({ id: 'b' }), 'reading', T1)
    const incoming = setStatus(
      setStatus(setStatus(emptyLibrary(), buildSnapshot({ id: 'a' }), 'dropped', T0), buildSnapshot({ id: 'b' }), 'completed', T2),
      buildSnapshot({ id: 'c' }),
      'reading',
      T0,
    )
    const { library, added, updated } = mergeLibraries(local, incoming)
    expect({ added, updated }).toEqual({ added: 1, updated: 1 })
    expect(library.entries.a?.status).toBe('reading')
    expect(library.entries.b?.status).toBe('completed')
  })

  it('builds snapshots from catalog summaries', () => {
    expect(toSnapshot(buildSummary({ id: '9', chapters: 12 }))).toMatchObject({ id: '9', chapters: 12, coverMedium: 'https://s4.anilist.co/m.jpg' })
  })
})
