export default defineEventHandler(event => {
  const siteUrl = String(useRuntimeConfig().public.siteUrl).replace(/\/+$/, '')
  setResponseHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  return ['User-agent: *', 'Allow: /', 'Disallow: /api/', 'Disallow: /library', 'Disallow: /search', '', `Sitemap: ${siteUrl}/sitemap.xml`, ''].join('\n')
})
