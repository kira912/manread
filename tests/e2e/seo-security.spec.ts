import { expect, test } from '@playwright/test'
import { visit } from './helpers'

test('manga pages expose canonical, social and structured metadata', async ({ page }) => {
  await visit(page, '/manga/9001/saltwater-archive')
  await expect(page).toHaveTitle('Saltwater Archive — where to read · Manread')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'http://localhost:3210/manga/9001/saltwater-archive')
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'book')
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image')
  const jsonLd = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? '{}')
  expect(jsonLd).toMatchObject({ '@type': 'ComicSeries', name: 'Saltwater Archive', author: [{ name: 'Aoi Kirishima' }] })
})

test('filtered searches are not indexed', async ({ page }) => {
  await visit(page, '/search?q=fox')
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
})

test('robots.txt and sitemap are generated', async ({ request }) => {
  const robots = await (await request.get('/robots.txt')).text()
  expect(robots).toContain('Sitemap: http://localhost:3210/sitemap.xml')
  expect(robots).toContain('Disallow: /api/')
  const sitemap = await request.get('/sitemap.xml')
  expect(sitemap.headers()['content-type']).toContain('application/xml')
  const body = await sitemap.text()
  expect(body).toContain('<loc>http://localhost:3210/manga/9001/saltwater-archive</loc>')
  expect(body).toContain('<loc>http://localhost:3210/genre/drama</loc>')
})

test('responses carry security headers and a nonce-based CSP', async ({ request }) => {
  const response = await request.get('/')
  const headers = response.headers()
  expect(headers['content-security-policy']).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/)
  expect(headers['content-security-policy']).toContain("frame-ancestors 'none'")
  expect(headers['x-frame-options']).toBe('DENY')
  expect(headers['x-content-type-options']).toBe('nosniff')
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
  expect(headers['x-request-id']).toBeTruthy()
  expect(headers['x-powered-by']).toBeUndefined()
})

test('API validates input and hides internals', async ({ request }) => {
  expect((await request.get('/api/manga/..%2F..%2Fetc')).status()).toBe(400)
  expect((await request.get('/api/manga/999999')).status()).toBe(404)
  const search = await request.get('/api/search?q=<script>alert(1)</script>')
  expect(search.status()).toBe(400)
  expect((await request.get('/api/metrics')).status()).toBe(404)
  const crossSite = await request.post('/api/telemetry/errors', {
    headers: { Origin: 'https://evil.example.com' },
    data: { kind: 'vue', message: 'x', route: 'index' },
  })
  expect(crossSite.status()).toBe(403)
  const invalid = await request.post('/api/telemetry/vitals', { data: { name: 'LCP', value: -1, rating: 'good', route: 'x' } })
  expect(invalid.status()).toBe(400)
})

test('the skip link moves focus to the main content', async ({ page, isMobile }) => {
  test.skip(isMobile, 'keyboard-only check')
  await visit(page, '/')
  await page.keyboard.press('Tab')
  const skip = page.getByRole('link', { name: 'Skip to content' })
  await expect(skip).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/#main$/)
})
