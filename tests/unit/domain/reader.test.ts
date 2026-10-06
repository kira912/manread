import { describe, expect, it } from 'vitest'
import { emptyLibrary, recordChapterRead, setStatus } from '#shared/domain/library'
import {
  adjacentChapters,
  chapterLabel,
  clampPage,
  emptyReadingPositions,
  READING_POSITIONS_CAPACITY,
  resolveReaderSettings,
  resumePage,
  savePosition,
  type Chapter,
} from '#shared/domain/reader'
import { buildSnapshot } from '../../support/builders'

const T0 = '2026-01-01T00:00:00.000Z'
const T1 = '2026-01-02T00:00:00.000Z'

function chapter(number: number): Chapter {
  return {
    id: `src~c${number}`,
    mangaId: '1',
    number,
    title: null,
    pageCount: 10,
    publishedAt: null,
    sourceName: 'Source',
    license: { name: 'CC0', url: null, rightsHolder: 'Someone' },
  }
}

describe('reader settings', () => {
  it('reads manga right to left page by page and manhwa vertically by default', () => {
    expect(resolveReaderSettings({ mode: 'auto', direction: 'auto', fit: 'height' }, 'JP')).toEqual({ mode: 'paged', direction: 'rtl', fit: 'height' })
    expect(resolveReaderSettings({ mode: 'auto', direction: 'auto', fit: 'width' }, 'KR')).toEqual({ mode: 'vertical', direction: 'ltr', fit: 'width' })
  })

  it('lets explicit preferences win', () => {
    expect(resolveReaderSettings({ mode: 'vertical', direction: 'ltr', fit: 'height' }, 'JP')).toMatchObject({ mode: 'vertical', direction: 'ltr' })
  })
})

describe('chapters', () => {
  it('finds neighbours regardless of input order', () => {
    const chapters = [chapter(3), chapter(1), chapter(2)]
    expect(adjacentChapters(chapters, 'src~c2')).toEqual({ previous: chapter(1), next: chapter(3) })
    expect(adjacentChapters(chapters, 'src~c1').previous).toBeNull()
    expect(adjacentChapters(chapters, 'unknown')).toEqual({ previous: null, next: null })
  })

  it('labels chapters, including fractional numbers', () => {
    expect(chapterLabel({ number: 10.5, title: 'Interlude' })).toBe('Chapter 10.5 — Interlude')
    expect(chapterLabel({ number: 3, title: null })).toBe('Chapter 3')
  })

  it('clamps pages into range', () => {
    expect(clampPage(-3, 5)).toBe(0)
    expect(clampPage(9, 5)).toBe(4)
    expect(clampPage(2.7, 5)).toBe(2)
  })
})

describe('reading positions', () => {
  it('resumes mid-chapter but restarts finished or different chapters', () => {
    let positions = savePosition(emptyReadingPositions(), '1', { chapterId: 'src~c1', chapterNumber: 1, page: 4, pageCount: 10, updatedAt: T0 })
    expect(resumePage(positions, '1', 'src~c1', 10)).toBe(4)
    expect(resumePage(positions, '1', 'src~c2', 10)).toBe(0)
    positions = savePosition(positions, '1', { chapterId: 'src~c1', chapterNumber: 1, page: 9, pageCount: 10, updatedAt: T1 })
    expect(resumePage(positions, '1', 'src~c1', 10)).toBe(0)
  })

  it('keeps the most recent titles within capacity', () => {
    let positions = emptyReadingPositions()
    for (let index = 0; index < READING_POSITIONS_CAPACITY + 10; index += 1) {
      positions = savePosition(positions, String(index), {
        chapterId: 'src~c1',
        chapterNumber: 1,
        page: 1,
        pageCount: 3,
        updatedAt: new Date(index * 1000).toISOString(),
      })
    }
    expect(Object.keys(positions.entries)).toHaveLength(READING_POSITIONS_CAPACITY)
    expect(positions.entries['0']).toBeUndefined()
  })
})

describe('recordChapterRead', () => {
  it('adds an unknown title as reading', () => {
    const library = recordChapterRead(emptyLibrary(), buildSnapshot({ chapters: null, status: 'releasing' }), 0, T0)
    expect(library.entries['1']).toMatchObject({ status: 'reading', chapter: 0 })
  })

  it('never moves progress backwards', () => {
    const library = recordChapterRead(emptyLibrary(), buildSnapshot({ chapters: null }), 7, T0)
    expect(recordChapterRead(library, buildSnapshot({ chapters: null }), 3, T1)).toBe(library)
  })

  it('completes a finished series on its last chapter and caps at the known length', () => {
    const saved = setStatus(emptyLibrary(), buildSnapshot({ chapters: 12, status: 'finished' }), 'plan_to_read', T0)
    expect(recordChapterRead(saved, buildSnapshot({ chapters: 12, status: 'finished' }), 99, T1).entries['1']).toMatchObject({
      chapter: 12,
      status: 'completed',
    })
  })

  it('floors fractional chapters', () => {
    expect(recordChapterRead(emptyLibrary(), buildSnapshot({ chapters: null }), 10.5, T0).entries['1']?.chapter).toBe(10)
  })
})
