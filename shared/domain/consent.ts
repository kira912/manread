export const CONSENT_SCHEMA_VERSION = 1
// CNIL guidance: a recorded choice (accept or refuse) is kept for six months, then asked again.
export const CONSENT_LIFETIME_MS = 182 * 24 * 60 * 60 * 1000

export const CONSENT_CHOICES = ['granted', 'denied'] as const
export type ConsentChoice = (typeof CONSENT_CHOICES)[number]
export type ConsentStatus = ConsentChoice | 'pending'

export interface AnalyticsConsent {
  readonly version: typeof CONSENT_SCHEMA_VERSION
  readonly choice: ConsentChoice | null
  readonly decidedAt: string | null
}

export function emptyConsent(): AnalyticsConsent {
  return { version: CONSENT_SCHEMA_VERSION, choice: null, decidedAt: null }
}

export function recordConsent(choice: ConsentChoice, now: string): AnalyticsConsent {
  return { version: CONSENT_SCHEMA_VERSION, choice, decidedAt: now }
}

export function consentStatus(consent: AnalyticsConsent, now: Date): ConsentStatus {
  if (!consent.choice || !consent.decidedAt) return 'pending'
  const decidedAt = Date.parse(consent.decidedAt)
  if (Number.isNaN(decidedAt) || decidedAt > now.getTime() || now.getTime() - decidedAt > CONSENT_LIFETIME_MS) return 'pending'
  return consent.choice
}
