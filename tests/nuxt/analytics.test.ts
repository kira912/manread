import { afterEach, describe, expect, it, vi } from 'vitest'

describe('trackEvent', () => {
  afterEach(() => {
    delete window.umami
  })

  it('forwards typed events to Umami with trimmed, bounded text', () => {
    const track = vi.fn()
    window.umami = { track }
    trackEvent('search', { source: 'palette', term: `  ${'x'.repeat(100)}  ` })
    expect(track).toHaveBeenCalledWith('search', { source: 'palette', term: 'x'.repeat(60) })
  })

  it('never throws when a tracker fails or is absent', () => {
    window.umami = {
      track: () => {
        throw new Error('blocked')
      },
    }
    expect(() => trackEvent('favorite', { enabled: true, manga: 'A' })).not.toThrow()
    delete window.umami
    expect(() => trackEvent('favorite', { enabled: false, manga: 'A' })).not.toThrow()
  })
})
