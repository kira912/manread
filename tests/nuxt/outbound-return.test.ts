import { beforeEach, describe, expect, it } from 'vitest'

const visit = { mangaId: '9001', title: 'Saltwater Archive', platformName: 'MANGA Plus', nextChapter: 4 }

describe('outbound return prompt', () => {
  beforeEach(() => sessionStorage.clear())

  it('remembers a visit and returns it once after a meaningful absence', () => {
    rememberOutbound(visit)
    const leftAt = JSON.parse(sessionStorage.getItem('manread:outbound') ?? '{}').leftAt as number
    expect(takePendingReturn(leftAt + 60_000)).toMatchObject(visit)
    expect(takePendingReturn(leftAt + 60_000)).toBeNull()
  })

  it('ignores quick bounces and stale visits', () => {
    rememberOutbound(visit)
    const leftAt = JSON.parse(sessionStorage.getItem('manread:outbound') ?? '{}').leftAt as number
    expect(takePendingReturn(leftAt + 5_000)).toBeNull()
    rememberOutbound(visit)
    expect(takePendingReturn(Date.now() + 7 * 60 * 60 * 1000)).toBeNull()
  })

  it('rejects tampered data', () => {
    sessionStorage.setItem('manread:outbound', JSON.stringify({ ...visit, nextChapter: '<script>', leftAt: 0 }))
    expect(takePendingReturn(60_000)).toBeNull()
    sessionStorage.setItem('manread:outbound', '{broken')
    expect(takePendingReturn()).toBeNull()
  })
})
