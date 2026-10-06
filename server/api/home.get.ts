import { getHomeFeed } from '../application/get-home-feed'
import { defineApiHandler } from '../utils/api'
import { useCatalogContext } from '../utils/container'
import { HTTP_CACHE_SECONDS } from '../utils/http-cache'

export default defineApiHandler(() => getHomeFeed(useCatalogContext()), { cache: HTTP_CACHE_SECONDS.home })
