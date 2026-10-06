import { z } from 'zod'
import { defineApiHandler, parseRequestBody } from '../../utils/api'
import { useContainer } from '../../utils/container'

const clientErrorSchema = z.object({
  kind: z.enum(['vue', 'window', 'unhandledrejection', 'fetch']),
  message: z.string().max(500),
  route: z.string().max(80).regex(/^[\w-]+$/),
  stack: z.string().max(2_000).optional(),
})

export default defineApiHandler(async event => {
  const report = await parseRequestBody(event, clientErrorSchema)
  const { logger, metrics } = useContainer()
  metrics.increment('client_error', { kind: report.kind })
  logger.warn('client error reported', { ...report, requestId: event.context.requestId })
  setResponseStatus(event, 204)
  return null
})
