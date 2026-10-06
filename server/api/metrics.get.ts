import { timingSafeEqual } from 'node:crypto'
import { defineApiHandler } from '../utils/api'
import { useContainer } from '../utils/container'

export default defineApiHandler(async event => {
  const expected = String(useRuntimeConfig().metricsToken ?? '')
  const provided = getRequestHeader(event, 'authorization')?.replace(/^Bearer\s+/i, '') ?? ''
  if (!expected || !safeEqual(provided, expected)) throw createError({ statusCode: 404, statusMessage: 'Not found' })

  const { metrics, providerHealth } = useContainer()
  return { providers: providerHealth(), ...metrics.snapshot() }
})

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}
