import { defineApiHandler } from '../utils/api'
import { useContainer } from '../utils/container'

export default defineApiHandler(async () => {
  const { providerHealth, metrics } = useContainer()
  const providers = providerHealth()
  return {
    status: providers.every(provider => provider.circuit !== 'open') ? 'ok' : 'degraded',
    providers,
    metrics: import.meta.dev ? metrics.snapshot() : undefined,
  }
})
