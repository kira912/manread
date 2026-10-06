import { z } from 'zod'

const nullableString = z.string().nullable().optional().transform(value => value ?? null)
const nullableNumber = z.number().nullable().optional().transform(value => value ?? null)

const fuzzyDateSchema = z
  .object({ year: nullableNumber, month: nullableNumber, day: nullableNumber })
  .nullable()
  .optional()
  .transform(value => value ?? null)

const titleSchema = z.object({ romaji: nullableString, english: nullableString, native: nullableString })

export const rawSummarySchema = z.object({
  id: z.number().int().positive(),
  title: titleSchema,
  coverImage: z
    .object({ medium: nullableString, large: nullableString, extraLarge: nullableString, color: nullableString })
    .nullable()
    .transform(value => value ?? { medium: null, large: null, extraLarge: null, color: null }),
  status: nullableString,
  format: nullableString,
  countryOfOrigin: nullableString,
  startDate: fuzzyDateSchema,
  genres: z.array(z.string()).nullable().optional().transform(value => value ?? []),
  averageScore: nullableNumber,
  popularity: nullableNumber,
  favourites: nullableNumber,
  chapters: nullableNumber,
  isAdult: z.boolean().nullable().optional().transform(value => value ?? false),
})
export type RawSummary = z.infer<typeof rawSummarySchema>

export const rawExternalLinkSchema = z.object({
  id: z.number().int(),
  site: z.string(),
  siteId: nullableNumber,
  url: nullableString,
  type: nullableString,
  language: nullableString,
  isDisabled: z.boolean().nullable().optional().transform(value => value ?? false),
})
export type RawExternalLink = z.infer<typeof rawExternalLinkSchema>

const rawStaffNodeSchema = z.object({
  id: z.number().int().positive(),
  name: z.object({ full: nullableString, native: nullableString }),
  image: z
    .object({ medium: nullableString })
    .nullable()
    .optional()
    .transform(value => value ?? { medium: null }),
})

export const rawMediaDetailSchema = rawSummarySchema.extend({
  synonyms: z.array(z.string()).nullable().optional().transform(value => value ?? []),
  description: nullableString,
  bannerImage: nullableString,
  volumes: nullableNumber,
  updatedAt: nullableNumber,
  startDate: fuzzyDateSchema,
  endDate: fuzzyDateSchema,
  tags: z
    .array(z.object({ name: z.string(), rank: nullableNumber, isMediaSpoiler: z.boolean().nullable(), isAdult: z.boolean().nullable() }))
    .nullable()
    .optional()
    .transform(value => value ?? []),
  staff: z
    .object({ edges: z.array(z.object({ role: nullableString, node: z.unknown() })).nullable() })
    .nullable()
    .optional(),
  relations: z
    .object({ edges: z.array(z.object({ relationType: nullableString, node: z.unknown() })).nullable() })
    .nullable()
    .optional(),
  externalLinks: z.array(z.unknown()).nullable().optional().transform(value => value ?? []),
})
export type RawMediaDetail = z.infer<typeof rawMediaDetailSchema>

export const rawStaffSchema = rawStaffNodeSchema
export type RawStaffNode = z.infer<typeof rawStaffNodeSchema>

export const rawCreatorSearchItemSchema = rawStaffNodeSchema.extend({
  primaryOccupations: z.array(z.string()).nullable().optional().transform(value => value ?? []),
})

export const rawCreatorSchema = z.object({
  id: z.number().int().positive(),
  name: z.object({ full: nullableString, native: nullableString }),
  image: z
    .object({ large: nullableString })
    .nullable()
    .optional()
    .transform(value => value ?? { large: null }),
  description: nullableString,
  staffMedia: z
    .object({ edges: z.array(z.object({ staffRole: nullableString, node: z.unknown() })).nullable() })
    .nullable()
    .optional(),
})

const pageOf = <T extends z.ZodType>(key: string, item: T) =>
  z.object({
    pageInfo: z
      .object({ hasNextPage: z.boolean().nullable().optional(), total: nullableNumber })
      .optional(),
    [key]: z.array(item).nullable().transform(value => value ?? []),
  })

export const mediaDetailResponseSchema = z.object({ Media: z.unknown() })

export const searchResponseSchema = z.object({
  Page: z.object({
    pageInfo: z.object({ hasNextPage: z.boolean().nullable(), total: nullableNumber }),
    media: z.array(z.unknown()).nullable().transform(value => value ?? []),
  }),
})

export const instantSearchResponseSchema = z.object({
  manga: pageOf('media', z.unknown()),
  creators: pageOf('staff', z.unknown()),
})

export const mediaListResponseSchema = z.object({ Page: pageOf('media', z.unknown()) })

export const recommendationsResponseSchema = z.object({
  Media: z
    .object({
      recommendations: z.object({
        nodes: z.array(z.object({ mediaRecommendation: z.unknown() })).nullable().transform(value => value ?? []),
      }),
    })
    .nullable(),
})

export const creatorResponseSchema = z.object({ Staff: z.unknown() })

export const genresResponseSchema = z.object({ GenreCollection: z.array(z.string()) })

export const platformsResponseSchema = z.object({
  ExternalLinkSourceCollection: z.array(
    z.object({ id: z.number().int(), site: z.string(), language: nullableString, isDisabled: z.boolean().nullable().optional() }),
  ),
})

export const indexableResponseSchema = z.object({
  Page: z.object({
    pageInfo: z.object({ hasNextPage: z.boolean().nullable() }),
    media: z.array(z.object({ id: z.number().int(), title: titleSchema, isAdult: z.boolean().nullable() })).nullable(),
  }),
})

export const graphQlEnvelopeSchema = z.object({
  data: z.unknown().optional(),
  errors: z
    .array(z.object({ message: z.string(), status: z.number().optional() }))
    .optional(),
})
