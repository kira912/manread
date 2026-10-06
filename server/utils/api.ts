import type { H3Event } from 'h3'
import { z } from 'zod'
import { InvalidInputError, isDomainError, ProviderRateLimitedError, type DomainError } from '#shared/domain/errors'
import { useContainer } from './container'

export interface HttpCacheSettings {
  readonly maxAge: number
  readonly sMaxAge: number
  readonly staleWhileRevalidate: number
}

const DOMAIN_STATUS: Record<DomainError['code'], number> = {
  not_found: 404,
  invalid_input: 400,
  provider_unavailable: 503,
  provider_rate_limited: 503,
  provider_invalid_response: 502,
  storage_unavailable: 503,
  library_invariant: 409,
}

const PUBLIC_MESSAGES: Record<DomainError['code'], string> = {
  not_found: 'Not found',
  invalid_input: 'Invalid request',
  provider_unavailable: 'Catalog temporarily unavailable',
  provider_rate_limited: 'Catalog temporarily busy',
  provider_invalid_response: 'Catalog returned an unexpected response',
  storage_unavailable: 'Storage unavailable',
  library_invariant: 'Conflicting library state',
}

const DEFAULT_RETRY_AFTER_SECONDS = 30
const RESOURCE_ID = /^[a-z0-9-]{1,40}$/

export function defineApiHandler<T>(handler: (event: H3Event) => Promise<T>, options: { cache?: HttpCacheSettings } = {}) {
  return defineEventHandler(async event => {
    try {
      const result = await handler(event)
      setResponseHeader(event, 'Cache-Control', options.cache ? cacheControl(options.cache) : 'no-store')
      return result
    } catch (error) {
      throw toHttpError(event, error)
    }
  })
}

export function requireResourceId(event: H3Event, name: string): string {
  const value = getRouterParam(event, name)
  if (!value || !RESOURCE_ID.test(value)) throw new InvalidInputError(`Invalid ${name}`)
  return value
}

export async function parseRequestBody<S extends z.ZodType>(event: H3Event, schema: S): Promise<z.infer<S>> {
  const result = schema.safeParse(await readBody(event))
  if (!result.success) {
    throw new InvalidInputError('Invalid body', result.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`))
  }
  return result.data
}

function toHttpError(event: H3Event, error: unknown) {
  if (isError(error)) return error

  const { logger, metrics } = useContainer()
  const requestId = event.context.requestId as string | undefined

  if (isDomainError(error)) {
    const statusCode = DOMAIN_STATUS[error.code]
    if (statusCode >= 500) {
      logger.warn('request degraded by domain error', { requestId, path: event.path, code: error.code, error: error.message })
    }
    if (error instanceof ProviderRateLimitedError || error.code === 'provider_unavailable') {
      const retryAfter = error instanceof ProviderRateLimitedError && error.retryAfterMs ? Math.ceil(error.retryAfterMs / 1000) : DEFAULT_RETRY_AFTER_SECONDS
      setResponseHeader(event, 'Retry-After', retryAfter)
    }
    metrics.increment('api_error', { code: error.code })
    return createError({ statusCode, statusMessage: PUBLIC_MESSAGES[error.code], data: { code: error.code, requestId } })
  }

  metrics.increment('api_error', { code: 'internal' })
  logger.error('unhandled API error', { requestId, path: event.path, error })
  return createError({ statusCode: 500, statusMessage: 'Internal error', data: { code: 'internal', requestId } })
}

function cacheControl(settings: HttpCacheSettings): string {
  return `public, max-age=${settings.maxAge}, s-maxage=${settings.sMaxAge}, stale-while-revalidate=${settings.staleWhileRevalidate}`
}
