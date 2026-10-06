import { listReadableChapters } from '../../../application/reading'
import { defineApiHandler, requireResourceId } from '../../../utils/api'
import { useCatalogContext } from '../../../utils/container'
import { HTTP_CACHE_SECONDS } from '../../../utils/http-cache'

export default defineApiHandler(
  async event => ({ chapters: await listReadableChapters(useCatalogContext(), requireResourceId(event, 'id')) }),
  { cache: HTTP_CACHE_SECONDS.chapters },
)
