export interface Platform {
  readonly id: string
  readonly name: string
  readonly languages: readonly string[]
}

export interface Availability {
  readonly platformId: string
  readonly platformName: string
  readonly url: string
  readonly language: string | null
  readonly sourceProvider: string
}

export interface PlatformAvailability {
  readonly platformId: string
  readonly platformName: string
  readonly offers: readonly { readonly language: string | null; readonly url: string }[]
}

const PREFERRED_LANGUAGE = 'English'

export function groupAvailabilityByPlatform(availability: readonly Availability[]): PlatformAvailability[] {
  const groups = new Map<string, { platformName: string; offers: Map<string, { language: string | null; url: string }> }>()

  for (const entry of availability) {
    const group = groups.get(entry.platformId) ?? { platformName: entry.platformName, offers: new Map() }
    const offerKey = entry.language ?? ''
    if (!group.offers.has(offerKey)) group.offers.set(offerKey, { language: entry.language, url: entry.url })
    groups.set(entry.platformId, group)
  }

  return [...groups.entries()]
    .map(([platformId, group]) => ({
      platformId,
      platformName: group.platformName,
      offers: [...group.offers.values()].sort(compareOffers),
    }))
    .sort(comparePlatforms)
}

export function mergeAvailability(...sources: readonly (readonly Availability[])[]): Availability[] {
  const seen = new Set<string>()
  const merged: Availability[] = []
  for (const entry of sources.flat()) {
    const key = `${entry.platformId}|${entry.language ?? ''}|${normalizeUrlForComparison(entry.url)}`
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(entry)
  }
  return merged
}

export function primaryOffer(platform: PlatformAvailability): { language: string | null; url: string } | undefined {
  return platform.offers[0]
}

function compareOffers(a: { language: string | null }, b: { language: string | null }): number {
  return languageWeight(b.language) - languageWeight(a.language) || (a.language ?? '').localeCompare(b.language ?? '')
}

function comparePlatforms(a: PlatformAvailability, b: PlatformAvailability): number {
  const aWeight = Math.max(...a.offers.map(offer => languageWeight(offer.language)))
  const bWeight = Math.max(...b.offers.map(offer => languageWeight(offer.language)))
  return bWeight - aWeight || b.offers.length - a.offers.length || a.platformName.localeCompare(b.platformName)
}

function languageWeight(language: string | null): number {
  return language === PREFERRED_LANGUAGE ? 1 : 0
}

function normalizeUrlForComparison(url: string): string {
  return url.replace(/\/+$/, '').toLowerCase()
}
