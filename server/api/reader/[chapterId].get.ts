import { InvalidInputError } from '#shared/domain/errors'
import { CHAPTER_ID_PATTERN } from '#shared/domain/reader'
import { getReadableChapter } from '../../application/reading'
import { defineApiHandler } from '../../utils/api'
import { useCatalogContext } from '../../utils/container'
import { HTTP_CACHE_SECONDS } from '../../utils/http-cache'

export default defineApiHandler(
  event => {
    const chapterId = decodeURIComponent(getRouterParam(event, 'chapterId') ?? '')
    if (!CHAPTER_ID_PATTERN.test(chapterId)) throw new InvalidInputError('Invalid chapter id')
    return getReadableChapter(useCatalogContext(), chapterId)
  },
  { cache: HTTP_CACHE_SECONDS.chapters },
)
