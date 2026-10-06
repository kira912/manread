import { mangaPath } from '#shared/domain/manga'
import { genreSlug } from '#shared/domain/labels'
import { getSearchFacets, listSitemapManga } from '../application/catalog-queries'
import { describeError } from '../application/context'
import { useCatalogContext, useLogger } from '../utils/container'

const SITEMAP_CACHE_SECONDS = 3_600

export default defineEventHandler(async event => {
  const siteUrl = String(useRuntimeConfig().public.siteUrl).replace(/\/+$/, '')
  const context = useCatalogContext()
  const [manga, facets] = await Promise.allSettled([listSitemapManga(context), getSearchFacets(context)])

  const paths = ['/']
  if (facets.status === 'fulfilled') paths.push(...facets.value.genres.map(genre => `/genre/${genreSlug(genre)}`))
  if (manga.status === 'fulfilled') paths.push(...manga.value.map(mangaPath))

  for (const failure of [manga, facets].filter(result => result.status === 'rejected')) {
    useLogger().warn('sitemap section unavailable', { error: describeError(failure.reason) })
  }

  setResponseHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  setResponseHeader(event, 'Cache-Control', `public, max-age=${SITEMAP_CACHE_SECONDS}, s-maxage=${SITEMAP_CACHE_SECONDS}`)
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...paths.map(path => `  <url><loc>${escapeXml(siteUrl + path)}</loc></url>`),
    '</urlset>',
  ].join('\n')
})

function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, character => `&#${character.charCodeAt(0)};`)
}
