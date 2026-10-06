import type { Platform } from './availability'
import type { MangaSummary } from './manga'

export const DISCOVERY_SECTIONS = ['trending', 'newReleases', 'hiddenGems', 'mostFollowed', 'recentlyAdded'] as const
export type DiscoverySection = (typeof DISCOVERY_SECTIONS)[number]

export interface EditorialPick {
  readonly manga: MangaSummary
  readonly note: string
}

export interface HomeHero {
  readonly manga: MangaSummary
  readonly synopsis: readonly string[]
  readonly platforms: readonly Pick<Platform, 'id' | 'name'>[]
}

export interface HomeFeed {
  readonly hero: HomeHero | null
  readonly sections: Readonly<Partial<Record<DiscoverySection, readonly MangaSummary[]>>>
  readonly editorsPicks: readonly EditorialPick[]
  readonly generatedAt: string
}

export interface SearchFacets {
  readonly genres: readonly string[]
  readonly platforms: readonly Platform[]
  readonly languages: readonly string[]
}
