import { expect, test, type Page } from '@playwright/test'
import { openSearch, visit } from './helpers'

type RecordedEvent = [name: string, data: Record<string, unknown>]

async function recordEvents(page: Page) {
  await page.addInitScript(() => {
    const events: [string, unknown][] = []
    Object.assign(window, { __events: events, umami: { track: (name: string, data: unknown) => events.push([name, data]) } })
  })
  return () => page.evaluate(() => (window as unknown as { __events: RecordedEvent[] }).__events)
}

test('key journeys emit product analytics events', async ({ page, isMobile }) => {
  test.skip(isMobile, 'one viewport is enough for event wiring')
  const events = await recordEvents(page)

  await visit(page, '/')
  const input = await openSearch(page)
  await input.fill('paper')
  await expect(page.getByRole('option', { name: /Paper Moon Courier/ })).toHaveAttribute('aria-selected', 'true')
  await input.press('Enter')
  await expect(page).toHaveURL(/paper-moon-courier/)

  await page.getByRole('button', { name: 'Ajouter à ma bibliothèque' }).click()
  const popup = page.waitForEvent('popup')
  await page.locator('#where-to-read').getByRole('link', { name: /Kite Reader/ }).first().click()
  await (await popup).close()

  expect(await events()).toEqual(
    expect.arrayContaining([
      ['search', { source: 'palette', term: 'paper' }],
      ['library_add', { status: 'plan_to_read', manga: 'Paper Moon Courier' }],
      ['outbound_platform', { platform: 'Kite Reader', manga: 'Paper Moon Courier' }],
    ]),
  )
})

test('reading emits open and completion events', async ({ page, isMobile }) => {
  test.skip(isMobile, 'keyboard flow')
  const events = await recordEvents(page)
  await visit(page, '/read/9001/manread-demo~saltwater-archive-c2')
  await page.keyboard.press('End')
  await expect(page.getByRole('img', { name: 'Page 5 sur 5' })).toBeVisible()
  await expect.poll(events).toEqual(
    expect.arrayContaining([
      ['reader_open', { manga: 'Saltwater Archive', chapter: 2 }],
      ['chapter_complete', { manga: 'Saltwater Archive', chapter: 2 }],
    ]),
  )
})

test('searches with no results are reported', async ({ page }) => {
  const events = await recordEvents(page)
  await visit(page, '/search?q=zzzz-nothing')
  await expect(page.getByText('Rien sur ces étagères')).toBeVisible()
  await expect.poll(events).toContainEqual(['search_no_results', { term: 'zzzz-nothing' }])
})

test('no third-party analytics load outside Vercel without configuration', async ({ page }) => {
  const external: string[] = []
  page.on('request', request => {
    const url = new URL(request.url())
    if (url.hostname !== 'localhost') external.push(url.hostname)
  })
  await visit(page, '/')
  expect(external.filter(host => /umami|vercel|google/.test(host))).toEqual([])
  await expect(page.locator('script[src*="umami"], script[src*="_vercel"], script[src*="googletagmanager"]')).toHaveCount(0)
  await expect(page.getByRole('region', { name: 'Mesure d’audience' })).toHaveCount(0)
})
