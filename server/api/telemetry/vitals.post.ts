import { z } from 'zod'
import { defineApiHandler, parseRequestBody } from '../../utils/api'
import { useContainer } from '../../utils/container'

const vitalSchema = z.object({
  name: z.enum(['LCP', 'INP', 'CLS', 'FCP', 'TTFB']),
  value: z.number().min(0).max(120_000),
  rating: z.enum(['good', 'needs-improvement', 'poor']),
  route: z.string().max(80).regex(/^[\w-]+$/),
})

export default defineApiHandler(async event => {
  const vital = await parseRequestBody(event, vitalSchema)
  const { metrics } = useContainer()
  metrics.observe(`web_vital_${vital.name.toLowerCase()}`, vital.value, { route: vital.route })
  metrics.increment('web_vital_rating', { name: vital.name, rating: vital.rating })
  setResponseStatus(event, 204)
  return null
})
