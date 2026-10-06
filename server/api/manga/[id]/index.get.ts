import { getMangaDetails } from '../../../application/get-manga-details'
import { defineApiHandler, requireResourceId } from '../../../utils/api'
import { useCatalogContext } from '../../../utils/container'
import { HTTP_CACHE_SECONDS } from '../../../utils/http-cache'

export default defineApiHandler(event => getMangaDetails(useCatalogContext(), requireResourceId(event, 'id')), {
  cache: HTTP_CACHE_SECONDS.manga,
})
