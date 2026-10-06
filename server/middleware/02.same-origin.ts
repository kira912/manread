const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

export default defineEventHandler(event => {
  if (!UNSAFE_METHODS.has(event.method) || !event.path.startsWith('/api/')) return

  const origin = getRequestHeader(event, 'origin')
  const fetchSite = getRequestHeader(event, 'sec-fetch-site')
  const host = getRequestHost(event, { xForwardedHost: true })

  const crossSiteFetch = fetchSite !== undefined && fetchSite !== 'same-origin' && fetchSite !== 'none'
  const foreignOrigin = origin !== undefined && URL.parse(origin)?.host !== host
  if (crossSiteFetch || foreignOrigin) {
    throw createError({ statusCode: 403, statusMessage: 'Cross-origin request rejected' })
  }
})
