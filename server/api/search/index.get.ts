import { parseSearchQuery } from '#shared/domain/search'
import { searchManga } from '../../application/search-manga'
import { defineApiHandler } from '../../utils/api'
import { useCatalogContext } from '../../utils/container'
import { HTTP_CACHE_SECONDS } from '../../utils/http-cache'

export default defineApiHandler(event => searchManga(useCatalogContext(), parseSearchQuery(getQuery(event))), {
  cache: HTTP_CACHE_SECONDS.search,
})
