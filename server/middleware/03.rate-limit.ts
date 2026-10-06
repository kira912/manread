import type { H3Event } from 'h3'
import { ClientRateLimiter } from '../infrastructure/security/client-rate-limiter'
import { useContainer } from '../utils/container'

const MAX_TRACKED_CLIENTS = 20_000

const TELEMETRY_REQUESTS_PER_MINUTE = 60
const SITEMAP_REQUESTS_PER_MINUTE = 10
let limiter: ClientRateLimiter | undefined

function useLimiter(): ClientRateLimiter {
  limiter ??= new ClientRateLimiter(
    [
      { prefix: '/api/telemetry/', requestsPerMinute: TELEMETRY_REQUESTS_PER_MINUTE },
      { prefix: '/api/', requestsPerMinute: Math.max(1, Number(useRuntimeConfig().apiRequestsPerMinute) || 1) },
      { prefix: '/sitemap.xml', requestsPerMinute: SITEMAP_REQUESTS_PER_MINUTE },
    ],
    MAX_TRACKED_CLIENTS,
  )
  return limiter
}

export default defineEventHandler(event => {
  const clientId = resolveClientId(event)
  if (clientId === null) return

  const decision = useLimiter().check(clientId, event.path)
  if (decision.allowed) return

  useContainer().metrics.increment('rate_limited', { route: event.path.split('?')[0]?.split('/').slice(0, 3).join('/') ?? '' })
  setResponseHeader(event, 'Retry-After', decision.retryAfterSeconds)
  throw createError({ statusCode: 429, statusMessage: 'Too many requests' })
})

function resolveClientId(event: H3Event): string | null {
  const socketAddress = event.node.req.socket?.remoteAddress
  if (!socketAddress) return null
  if (!useRuntimeConfig().trustProxy) return socketAddress
  const forwarded = getRequestHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || socketAddress
}
