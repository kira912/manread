import { getSearchFacets } from '../../application/catalog-queries'
import { defineApiHandler } from '../../utils/api'
import { useCatalogContext } from '../../utils/container'
import { HTTP_CACHE_SECONDS } from '../../utils/http-cache'

export default defineApiHandler(() => getSearchFacets(useCatalogContext()), { cache: HTTP_CACHE_SECONDS.facets })
