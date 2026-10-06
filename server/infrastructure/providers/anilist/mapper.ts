import type { z } from 'zod'
import type { Availability } from '#shared/domain/availability'
import {
  classifyCreatorRole,
  type CreatorCredit,
  type CreatorProfile,
  type CreatorSummary,
} from '#shared/domain/creator'
import { isMangaOrigin, type Manga, type MangaFormat, type MangaRelation, type MangaStatus, type MangaSummary, type MangaTag } from '#shared/domain/manga'
import { slugify } from '#shared/domain/slug'
import type { Logger, Metrics } from '../../../application/ports'
import { parseSafeExternalUrl } from '../../security/url-policy'
import { htmlToParagraphs } from '../../text/sanitize'
import {
  rawCreatorSchema,
  rawCreatorSearchItemSchema,
  rawExternalLinkSchema,
  rawMediaDetailSchema,
  rawStaffSchema,
  rawSummarySchema,
  type RawMediaDetail,
  type RawSummary,
} from './schemas'

export const ANILIST_PROVIDER_ID = 'anilist'
export const ANILIST_IMAGE_HOSTS = ['s4.anilist.co'] as const
export const COVER_PLACEHOLDER = '/images/cover-placeholder.svg'

const MAX_TAGS = 10
const MIN_TAG_RANK = 60
const MAX_RELATIONS = 12
const HEX_COLOR = /^#[0-9a-f]{6}$/i
const STREAMING_LINK_TYPE = 'STREAMING'

const STATUS_MAP: Record<string, MangaStatus> = {
  RELEASING: 'releasing',
  FINISHED: 'finished',
  HIATUS: 'hiatus',
  CANCELLED: 'cancelled',
  NOT_YET_RELEASED: 'upcoming',
}

const READABLE_RELATION_TYPES = new Set(['MANGA'])
const RELATION_LABELS: Record<string, string> = {
  SEQUEL: 'Sequel',
  PREQUEL: 'Prequel',
  SIDE_STORY: 'Side story',
  SPIN_OFF: 'Spin-off',
  ALTERNATIVE: 'Alternative',
  PARENT: 'Parent story',
  SUMMARY: 'Summary',
  COMPILATION: 'Compilation',
  CONTAINS: 'Contains',
  SOURCE: 'Source',
  OTHER: 'Related',
}

export interface MapperContext {
  readonly logger: Logger
  readonly metrics: Metrics
}

export function mapSummaries(items: readonly unknown[], context: MapperContext): MangaSummary[] {
  const summaries: MangaSummary[] = []
  for (const item of items) {
    const summary = mapSummary(item, context)
    if (summary) summaries.push(summary)
  }
  return summaries
}

export function mapSummary(item: unknown, context: MapperContext): MangaSummary | null {
  const raw = parseItem(rawSummarySchema, item, 'media_summary', context)
  return raw ? toSummary(raw) : null
}

export function mapMediaDetail(item: unknown, context: MapperContext): { manga: Manga; availability: Availability[] } | null {
  const raw = parseItem(rawMediaDetailSchema, item, 'media_detail', context)
  if (!raw) return null
  const summary = toSummary(raw)
  if (!summary) return null

  const manga: Manga = {
    ...summary,
    alternativeTitles: alternativeTitles(raw, summary.title),
    synopsis: htmlToParagraphs(raw.description),
    bannerImage: raw.bannerImage ? parseSafeExternalUrl(raw.bannerImage, ANILIST_IMAGE_HOSTS) : null,
    volumes: raw.volumes,
    endYear: raw.endDate?.year ?? null,
    startDate: formatFuzzyDate(raw.startDate),
    tags: mapTags(raw.tags),
    credits: mapCredits(raw.staff?.edges ?? [], context),
    relations: mapRelations(raw.relations?.edges ?? [], context),
    updatedAt: raw.updatedAt ? new Date(raw.updatedAt * 1000).toISOString() : null,
  }

  return { manga, availability: mapAvailability(raw.externalLinks, context) }
}

export function mapAvailability(links: readonly unknown[], context: MapperContext): Availability[] {
  const availability: Availability[] = []
  for (const item of links) {
    const link = parseItem(rawExternalLinkSchema, item, 'external_link', context)
    if (!link || link.isDisabled || link.type !== STREAMING_LINK_TYPE || !link.url) continue
    const url = parseSafeExternalUrl(link.url)
    if (!url) {
      context.metrics.increment('provider_rejected_url', { provider: ANILIST_PROVIDER_ID })
      context.logger.warn('rejected unsafe external link', { linkId: link.id, site: link.site })
      continue
    }
    availability.push({
      platformId: slugify(link.site),
      platformName: link.site.trim(),
      url,
      language: link.language,
      sourceProvider: ANILIST_PROVIDER_ID,
    })
  }
  return availability
}

export function mapCreatorSearchResults(items: readonly unknown[], context: MapperContext): CreatorSummary[] {
  const creators: CreatorSummary[] = []
  for (const item of items) {
    const raw = parseItem(rawCreatorSearchItemSchema, item, 'creator_search', context)
    if (!raw || !raw.name.full) continue
    const occupations = raw.primaryOccupations
    if (occupations.length > 0 && occupations.every(occupation => /voice|actor|actress/i.test(occupation))) continue
    creators.push({
      id: String(raw.id),
      slug: slugify(raw.name.full),
      name: raw.name.full,
      nativeName: raw.name.native,
      image: safeImage(raw.image.medium),
    })
  }
  return creators
}

export function mapCreator(item: unknown, context: MapperContext): CreatorProfile | null {
  const raw = parseItem(rawCreatorSchema, item, 'creator', context)
  if (!raw || !raw.name.full) return null

  const seen = new Set<string>()
  const works: CreatorProfile['works'][number][] = []
  for (const edge of raw.staffMedia?.edges ?? []) {
    const manga = mapSummary(edge.node, context)
    if (!manga || seen.has(manga.id)) continue
    seen.add(manga.id)
    works.push({ roleLabel: cleanRoleLabel(edge.staffRole), manga })
  }

  return {
    id: String(raw.id),
    slug: slugify(raw.name.full),
    name: raw.name.full,
    nativeName: raw.name.native,
    image: safeImage(raw.image.large),
    biography: htmlToParagraphs(stripAniListMarkdown(raw.description)),
    works,
  }
}

export function pickTitle(title: RawSummary['title']): string {
  return (title.english ?? title.romaji ?? title.native ?? 'Untitled').trim()
}

function toSummary(raw: RawSummary): MangaSummary | null {
  if (raw.isAdult) return null
  const origin = raw.countryOfOrigin
  if (!isMangaOrigin(origin)) return null

  const title = pickTitle(raw.title)
  return {
    id: String(raw.id),
    slug: slugify(raw.title.english ?? raw.title.romaji ?? title),
    title,
    nativeTitle: raw.title.native,
    cover: {
      small: safeImage(raw.coverImage.medium) ?? COVER_PLACEHOLDER,
      medium: safeImage(raw.coverImage.large) ?? safeImage(raw.coverImage.medium) ?? COVER_PLACEHOLDER,
      large: safeImage(raw.coverImage.extraLarge) ?? safeImage(raw.coverImage.large) ?? COVER_PLACEHOLDER,
      dominantColor: raw.coverImage.color && HEX_COLOR.test(raw.coverImage.color) ? raw.coverImage.color : null,
    },
    status: STATUS_MAP[raw.status ?? ''] ?? 'upcoming',
    format: mapFormat(raw.format),
    origin,
    startYear: raw.startDate?.year ?? null,
    genres: raw.genres,
    score: raw.averageScore,
    popularity: raw.popularity ?? 0,
    favourites: raw.favourites ?? 0,
    chapters: raw.chapters && raw.chapters > 0 ? raw.chapters : null,
  }
}

function mapFormat(format: string | null): MangaFormat {
  return format === 'ONE_SHOT' ? 'one_shot' : 'serial'
}

function alternativeTitles(raw: RawMediaDetail, mainTitle: string): string[] {
  const candidates = [raw.title.romaji, raw.title.english, raw.title.native, ...raw.synonyms]
  const seen = new Set([mainTitle.toLowerCase()])
  const titles: string[] = []
  for (const candidate of candidates) {
    const value = candidate?.trim()
    if (!value || seen.has(value.toLowerCase())) continue
    seen.add(value.toLowerCase())
    titles.push(value)
  }
  return titles.slice(0, 8)
}

function mapTags(tags: RawMediaDetail['tags']): MangaTag[] {
  return tags
    .filter(tag => !tag.isAdult && !tag.isMediaSpoiler && (tag.rank ?? 0) >= MIN_TAG_RANK)
    .sort((a, b) => (b.rank ?? 0) - (a.rank ?? 0))
    .slice(0, MAX_TAGS)
    .map(tag => ({ name: tag.name, rank: tag.rank ?? 0 }))
}

function mapCredits(edges: readonly { role: string | null; node: unknown }[], context: MapperContext): CreatorCredit[] {
  const credits = new Map<string, CreatorCredit>()
  for (const edge of edges) {
    const node = parseItem(rawStaffSchema, edge.node, 'staff', context)
    if (!node || !node.name.full) continue
    const roleLabel = cleanRoleLabel(edge.role)
    const credit: CreatorCredit = {
      creatorId: String(node.id),
      slug: slugify(node.name.full),
      name: node.name.full,
      role: classifyCreatorRole(roleLabel),
      roleLabel,
      image: safeImage(node.image.medium),
    }
    const existing = credits.get(credit.creatorId)
    if (!existing || existing.role === 'other') credits.set(credit.creatorId, credit)
  }
  return [...credits.values()]
}

function mapRelations(edges: readonly { relationType: string | null; node: unknown }[], context: MapperContext): MangaRelation[] {
  const relations: MangaRelation[] = []
  for (const edge of edges) {
    const node = edge.node as { type?: unknown } | null
    if (!node || !READABLE_RELATION_TYPES.has(String(node.type))) continue
    const manga = mapSummary(edge.node, context)
    if (!manga) continue
    relations.push({ kind: RELATION_LABELS[edge.relationType ?? 'OTHER'] ?? 'Related', manga })
  }
  return relations.slice(0, MAX_RELATIONS)
}

function cleanRoleLabel(role: string | null): string {
  return (role ?? 'Contributor').replace(/\s*\(.*\)\s*$/, '').trim() || 'Contributor'
}

function stripAniListMarkdown(value: string | null): string | null {
  if (!value) return value
  return value
    .replace(/~!.*?!~/gs, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/__|\*\*/g, '')
}

function formatFuzzyDate(date: { year: number | null; month: number | null; day: number | null } | null): string | null {
  if (!date?.year) return null
  if (!date.month) return String(date.year)
  const month = String(date.month).padStart(2, '0')
  if (!date.day) return `${date.year}-${month}`
  return `${date.year}-${month}-${String(date.day).padStart(2, '0')}`
}

function safeImage(url: string | null): string | null {
  return url ? parseSafeExternalUrl(url, ANILIST_IMAGE_HOSTS) : null
}

function parseItem<S extends z.ZodType>(schema: S, item: unknown, kind: string, context: MapperContext): z.infer<S> | null {
  const result = schema.safeParse(item)
  if (result.success) return result.data
  context.metrics.increment('provider_invalid_item', { provider: ANILIST_PROVIDER_ID, kind })
  context.logger.warn('dropped invalid provider item', {
    kind,
    issues: result.error.issues.slice(0, 3).map(issue => `${issue.path.join('.')}: ${issue.message}`),
  })
  return null
}
