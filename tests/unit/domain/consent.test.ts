import { describe, expect, it } from 'vitest'
import { consentStatus, emptyConsent, recordConsent } from '#shared/domain/consent'

describe('analytics consent', () => {
  const decidedAt = '2026-01-01T00:00:00.000Z'

  it('is pending until a choice is recorded', () => {
    expect(consentStatus(emptyConsent(), new Date(decidedAt))).toBe('pending')
  })

  it('keeps an accepted or refused choice for six months', () => {
    expect(consentStatus(recordConsent('granted', decidedAt), new Date('2026-06-01T00:00:00.000Z'))).toBe('granted')
    expect(consentStatus(recordConsent('denied', decidedAt), new Date('2026-06-01T00:00:00.000Z'))).toBe('denied')
  })

  it('asks again once the choice has expired', () => {
    expect(consentStatus(recordConsent('granted', decidedAt), new Date('2026-07-15T00:00:00.000Z'))).toBe('pending')
  })

  it('does not trust a decision dated in the future', () => {
    expect(consentStatus(recordConsent('granted', '2030-01-01T00:00:00.000Z'), new Date(decidedAt))).toBe('pending')
  })
})
