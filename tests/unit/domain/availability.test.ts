import { describe, expect, it } from 'vitest'
import { groupAvailabilityByPlatform, mergeAvailability } from '#shared/domain/availability'
import { buildAvailability } from '../../support/builders'

describe('availability', () => {
  it('groups offers by platform with English first', () => {
    const groups = groupAvailabilityByPlatform([
      buildAvailability({ platformId: 'kakao', platformName: 'KakaoPage', language: 'Korean', url: 'https://page.kakao.com/1' }),
      buildAvailability({ language: 'French', url: 'https://mangaplus.shueisha.co.jp/fr' }),
      buildAvailability({ language: 'English' }),
    ])
    expect(groups.map(group => group.platformId)).toEqual(['manga-plus', 'kakao'])
    expect(groups[0]?.offers.map(offer => offer.language)).toEqual(['English', 'French'])
  })

  it('keeps one offer per language on a platform', () => {
    const groups = groupAvailabilityByPlatform([
      buildAvailability({ url: 'https://www.viz.com/a' }),
      buildAvailability({ url: 'https://www.viz.com/b' }),
    ])
    expect(groups[0]?.offers).toHaveLength(1)
  })

  it('merges sources without duplicates', () => {
    const merged = mergeAvailability(
      [buildAvailability({ url: 'https://mangaplus.shueisha.co.jp/titles/1/' })],
      [buildAvailability({ url: 'https://MANGAPLUS.shueisha.co.jp/titles/1', sourceProvider: 'other' })],
    )
    expect(merged).toHaveLength(1)
  })
})
