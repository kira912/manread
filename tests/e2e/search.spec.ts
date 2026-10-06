import { expect, test } from '@playwright/test'
import { clickUntilVisible, visit } from './helpers'

test('filters are reflected in the URL and results', async ({ page, isMobile }) => {
  await visit(page, '/search?genre=Drama')
  await expect(page.getByRole('heading', { level: 1, name: 'Browse the index' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Northbound Silence' })).toBeVisible()

  const filters = page.getByRole('form', { name: 'Search filters' }).filter({ visible: true })
  if (isMobile) await clickUntilVisible(page.getByRole('button', { name: /^Filters/ }), filters)
  await filters.getByRole('button', { name: 'Manhwa' }).click()
  await expect(page).toHaveURL(/origin=KR/)
  if (isMobile) await page.getByRole('button', { name: 'Show results' }).click()

  await expect(page.getByRole('heading', { level: 2, name: 'The Concrete Garden' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Northbound Silence' })).toHaveCount(0)
})

test('impossible combinations show an empty state that can be reset', async ({ page }) => {
  await visit(page, '/search?genre=Horror&status=releasing')
  await expect(page.getByText('Nothing on these shelves')).toBeVisible()
  await page.getByRole('button', { name: 'Clear filters' }).click()
  await expect(page).toHaveURL(/\/search$/)
  await expect(page.getByRole('heading', { level: 2, name: 'Ninth Floor Fox' })).toBeVisible()
})

test('search works without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  await page.goto('/search')
  await page.getByRole('searchbox', { name: 'Search titles' }).fill('garden')
  await page.getByRole('searchbox', { name: 'Search titles' }).press('Enter')
  await expect(page).toHaveURL(/q=garden/)
  await expect(page.getByRole('heading', { level: 2, name: 'The Concrete Garden' })).toBeVisible()
  await context.close()
})

test('genre landing pages are server-rendered', async ({ page }) => {
  await visit(page, '/genre/fantasy')
  await expect(page.getByRole('heading', { level: 1, name: 'Fantasy' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Paper Moon Courier' })).toBeVisible()
})
