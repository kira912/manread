import { randomUUID } from 'node:crypto'
import { useContainer } from '../utils/container'

const INBOUND_REQUEST_ID = /^[a-zA-Z0-9-]{8,64}$/

export default defineEventHandler(event => {
  const inbound = getRequestHeader(event, 'x-request-id')
  const requestId = inbound && INBOUND_REQUEST_ID.test(inbound) ? inbound : randomUUID()
  event.context.requestId = requestId
  setResponseHeader(event, 'X-Request-Id', requestId)

  if (!event.path.startsWith('/api/')) return

  const startedAt = performance.now()
  event.node.res.once('finish', () => {
    const { logger, metrics } = useContainer()
    const durationMs = Math.round(performance.now() - startedAt)
    const route = event.path.split('?')[0] ?? event.path
    const status = event.node.res.statusCode
    metrics.observe('api_latency', durationMs, { status: `${Math.floor(status / 100)}xx` })
    logger.info('api request', { requestId, method: event.method, route, status, durationMs })
  })
})
