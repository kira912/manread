import type { MangaSummary } from './manga'

export const CREATOR_ROLES = ['story_art', 'story', 'art', 'other'] as const
export type CreatorRole = (typeof CREATOR_ROLES)[number]

export interface CreatorCredit {
  readonly creatorId: string
  readonly slug: string
  readonly name: string
  readonly role: CreatorRole
  readonly roleLabel: string
  readonly image: string | null
}

export interface CreatorSummary {
  readonly id: string
  readonly slug: string
  readonly name: string
  readonly nativeName: string | null
  readonly image: string | null
}

export interface CreatorProfile extends CreatorSummary {
  readonly biography: readonly string[]
  readonly works: readonly { readonly roleLabel: string; readonly manga: MangaSummary }[]
}

export function creatorPath(creator: { id: string; slug: string }): string {
  return `/creator/${creator.id}/${creator.slug}`
}

export function classifyCreatorRole(rawRole: string): CreatorRole {
  const role = rawRole.toLowerCase()
  const writes = /story|original creator|writer|author/.test(role)
  const draws = /art|illustrat/.test(role)
  if (writes && draws) return 'story_art'
  if (writes) return 'story'
  if (draws) return 'art'
  return 'other'
}

const ROLE_PRIORITY: Record<CreatorRole, number> = { story_art: 0, story: 1, art: 2, other: 3 }

export function principalCredits(credits: readonly CreatorCredit[]): CreatorCredit[] {
  return credits
    .filter(credit => credit.role !== 'other')
    .toSorted((a, b) => ROLE_PRIORITY[a.role] - ROLE_PRIORITY[b.role])
}
