import type { DiscoverySection } from '#shared/domain/discovery'

export const MANGA_FORMATS_FILTER = '[MANGA, ONE_SHOT]'

const SUMMARY_FIELDS = /* GraphQL */ `
  id
  title { romaji english native }
  coverImage { medium large extraLarge color }
  status
  format
  countryOfOrigin
  startDate { year }
  genres
  averageScore
  popularity
  favourites
  chapters
  isAdult
`

export const MEDIA_SUMMARY_FRAGMENT = /* GraphQL */ `
  fragment MediaSummary on Media {
    ${SUMMARY_FIELDS}
  }
`

const BASE_FILTER = `type: MANGA, isAdult: false, format_in: ${MANGA_FORMATS_FILTER}`

export const MEDIA_DETAIL_QUERY = /* GraphQL */ `
  query MediaDetail($id: Int!) {
    Media(id: $id, type: MANGA) {
      ...MediaSummary
      synonyms
      description(asHtml: false)
      bannerImage
      volumes
      updatedAt
      startDate { year month day }
      endDate { year }
      tags { name rank isMediaSpoiler isAdult }
      staff(perPage: 12, sort: [RELEVANCE, ROLE]) {
        edges { role node { id name { full native } image { medium } } }
      }
      relations {
        edges { relationType(version: 2) node { type ...MediaSummary } }
      }
      externalLinks { id site siteId url type language isDisabled }
    }
  }
  ${MEDIA_SUMMARY_FRAGMENT}
`

export const SEARCH_QUERY = /* GraphQL */ `
  query Search(
    $page: Int, $perPage: Int, $search: String, $genres: [String], $status: MediaStatus,
    $country: CountryCode, $startAfter: FuzzyDateInt, $startBefore: FuzzyDateInt,
    $licensedBy: [Int], $sort: [MediaSort]
  ) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { hasNextPage total }
      media(
        ${BASE_FILTER}, search: $search, genre_in: $genres, status: $status, countryOfOrigin: $country,
        startDate_greater: $startAfter, startDate_lesser: $startBefore, licensedById_in: $licensedBy, sort: $sort
      ) { ...MediaSummary }
    }
  }
  ${MEDIA_SUMMARY_FRAGMENT}
`

export const INSTANT_SEARCH_QUERY = /* GraphQL */ `
  query InstantSearch($search: String!, $mangaLimit: Int, $creatorLimit: Int) {
    manga: Page(perPage: $mangaLimit) {
      media(${BASE_FILTER}, search: $search, sort: [SEARCH_MATCH, POPULARITY_DESC]) { ...MediaSummary }
    }
    creators: Page(perPage: $creatorLimit) {
      staff(search: $search, sort: [SEARCH_MATCH, FAVOURITES_DESC]) {
        id name { full native } image { medium } primaryOccupations
      }
    }
  }
  ${MEDIA_SUMMARY_FRAGMENT}
`

export const MEDIA_BATCH_QUERY = /* GraphQL */ `
  query MediaBatch($ids: [Int], $perPage: Int) {
    Page(perPage: $perPage) {
      media(id_in: $ids, type: MANGA, isAdult: false) { ...MediaSummary }
    }
  }
  ${MEDIA_SUMMARY_FRAGMENT}
`

export const RECOMMENDATIONS_QUERY = /* GraphQL */ `
  query Recommendations($id: Int!, $perPage: Int) {
    Media(id: $id, type: MANGA) {
      recommendations(perPage: $perPage, sort: [RATING_DESC]) {
        nodes { mediaRecommendation { type ...MediaSummary } }
      }
    }
  }
  ${MEDIA_SUMMARY_FRAGMENT}
`

export const CREATOR_QUERY = /* GraphQL */ `
  query Creator($id: Int!) {
    Staff(id: $id) {
      id
      name { full native }
      image { large }
      description(asHtml: false)
      staffMedia(type: MANGA, perPage: 30, sort: [POPULARITY_DESC]) {
        edges { staffRole node { ...MediaSummary } }
      }
    }
  }
  ${MEDIA_SUMMARY_FRAGMENT}
`

export const GENRES_QUERY = /* GraphQL */ `
  query Genres {
    GenreCollection
  }
`

export const PLATFORMS_QUERY = /* GraphQL */ `
  query Platforms {
    ExternalLinkSourceCollection(mediaType: MANGA, type: STREAMING) { id site language isDisabled }
  }
`

export const INDEXABLE_QUERY = /* GraphQL */ `
  query Indexable($page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { hasNextPage }
      media(${BASE_FILTER}, sort: [POPULARITY_DESC]) { id title { romaji english native } isAdult }
    }
  }
`

const DISCOVERY_FILTERS: Record<DiscoverySection, string> = {
  trending: `${BASE_FILTER}, sort: [TRENDING_DESC]`,
  newReleases: `${BASE_FILTER}, status: RELEASING, startDate_greater: $recentSince, sort: [POPULARITY_DESC]`,
  hiddenGems: `${BASE_FILTER}, averageScore_greater: 79, popularity_greater: 1500, popularity_lesser: 15000, sort: [SCORE_DESC]`,
  mostFollowed: `${BASE_FILTER}, sort: [FAVOURITES_DESC]`,
  recentlyAdded: `${BASE_FILTER}, popularity_greater: 150, sort: [ID_DESC]`,
}

const DISCOVERY_PAGE_VARIABLE: Partial<Record<DiscoverySection, string>> = {
  hiddenGems: '$rotationPage',
}

export function buildDiscoveryQuery(sections: readonly DiscoverySection[]): string {
  const blocks = sections.map(section => {
    const page = DISCOVERY_PAGE_VARIABLE[section] ?? '1'
    return `${section}: Page(page: ${page}, perPage: $perPage) { media(${DISCOVERY_FILTERS[section]}) { ...MediaSummary } }`
  })
  return /* GraphQL */ `
    query Discovery($perPage: Int, $recentSince: FuzzyDateInt, $rotationPage: Int) {
      ${blocks.join('\n')}
    }
    ${MEDIA_SUMMARY_FRAGMENT}
  `
}
