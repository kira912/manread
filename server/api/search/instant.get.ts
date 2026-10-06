import { z } from 'zod'
import { SEARCH_LIMITS } from '#shared/domain/search'
import { instantSearch } from '../../application/search-manga'
import { defineApiHandler } from '../../utils/api'
import { useCatalogContext } from '../../utils/container'
import { HTTP_CACHE_SECONDS } from '../../utils/http-cache'

const instantQuerySchema = z.object({ q: z.string().max(SEARCH_LIMITS.maxTextLength).catch('') })

export default defineApiHandler(event => instantSearch(useCatalogContext(), instantQuerySchema.parse(getQuery(event)).q), {
  cache: HTTP_CACHE_SECONDS.search,
})
