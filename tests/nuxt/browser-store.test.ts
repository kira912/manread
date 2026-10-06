import { beforeEach, describe, expect, it, vi } from 'vitest'
import { StorageUnavailableError } from '#shared/domain/errors'
import { createBrowserStore } from '~/infrastructure/storage/browser-store'
import { librarySchema } from '~/infrastructure/storage/schemas'
import { emptyLibrary } from '#shared/domain/library'

describe('browser store', () => {
  beforeEach(() => localStorage.clear())

  it('reports empty storage', () => {
    expect(createBrowserStore('t', librarySchema, emptyLibrary).load()).toEqual({ status: 'empty', value: emptyLibrary() })
  })

  it('recovers from corrupted data and keeps a backup', () => {
    localStorage.setItem('manread:t', '{"version":1,"entries":{"x":{"bad":true}}}')
    const outcome = createBrowserStore('t', librarySchema, emptyLibrary).load()
    expect(outcome.status).toBe('recovered')
    expect(outcome.value).toEqual(emptyLibrary())
    const backupKey = outcome.status === 'recovered' ? outcome.backupKey : null
    expect(backupKey && localStorage.getItem(backupKey)).toContain('"bad":true')
  })

  it('recovers from invalid JSON', () => {
    localStorage.setItem('manread:t', '{nope')
    expect(createBrowserStore('t', librarySchema, emptyLibrary).load().status).toBe('recovered')
  })

  it('rejects unsafe URLs injected into storage', () => {
    const tampered = {
      version: 1,
      entries: {
        a: {
          manga: { id: 'a', slug: 'a', title: 'A', coverMedium: 'javascript:alert(1)', coverLarge: '/x', dominantColor: null, origin: 'JP', status: 'finished', chapters: null },
          status: 'reading',
          favorite: false,
          chapter: 0,
          preferredPlatform: null,
          addedAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      },
    }
    localStorage.setItem('manread:t', JSON.stringify(tampered))
    expect(createBrowserStore('t', librarySchema, emptyLibrary).load().status).toBe('recovered')
  })

  it('surfaces quota errors as a domain error', () => {
    const store = createBrowserStore('t', librarySchema, emptyLibrary)
    const original = localStorage.setItem.bind(localStorage)
    const spy = vi.spyOn(localStorage, 'setItem').mockImplementation((key: string, value: string) => {
      if (key === 'manread:t') throw new DOMException('full', 'QuotaExceededError')
      original(key, value)
    })
    try {
      expect(() => store.save(emptyLibrary())).toThrow(StorageUnavailableError)
      expect(spy).toHaveBeenCalledWith('manread:t', expect.any(String))
    } finally {
      spy.mockRestore()
    }
  })
})
