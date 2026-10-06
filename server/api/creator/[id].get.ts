import { getCreator } from '../../application/catalog-queries'
import { defineApiHandler, requireResourceId } from '../../utils/api'
import { useCatalogContext } from '../../utils/container'
import { HTTP_CACHE_SECONDS } from '../../utils/http-cache'

export default defineApiHandler(event => getCreator(useCatalogContext(), requireResourceId(event, 'id')), {
  cache: HTTP_CACHE_SECONDS.manga,
})
