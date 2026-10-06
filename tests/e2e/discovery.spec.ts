import { expect, test } from '@playwright/test'
import { openSearch, visit } from './helpers'

test('home presents the hero and editorial sections', async ({ page }) => {
  await visit(page, '/')
  await expect(page.getByRole('heading', { level: 1, name: 'Ninth Floor Fox' })).toBeVisible()
  for (const name of ['L’index', 'Encre fraîche', 'La sélection', 'Pépites cachées', 'Les plus suivis', 'Tout juste indexés']) {
    await expect(page.getByRole('heading', { level: 2, name })).toBeAttached()
  }
  await expect(page.getByRole('table', { name: 'Les mangas les plus suivis de tous les temps' })).toBeAttached()
})

test('search palette goes from query to manga page with the keyboard', async ({ page }) => {
  await visit(page, '/')
  const input = await openSearch(page)
  await expect(input).toBeFocused()
  await input.fill('paper')
  const option = page.getByRole('option', { name: /Paper Moon Courier/ })
  await expect(option).toHaveAttribute('aria-selected', 'true')
  await input.press('Enter')
  await expect(page).toHaveURL(/\/manga\/9003\/paper-moon-courier$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Paper Moon Courier' })).toBeVisible()
})

test('recent searches are remembered', async ({ page }) => {
  await visit(page, '/')
  let input = await openSearch(page)
  await input.fill('saltwater')
  await expect(page.getByRole('option', { name: /Saltwater Archive/ })).toBeVisible()
  await input.press('Enter')
  await expect(page).toHaveURL(/saltwater-archive/)
  input = await openSearch(page)
  await expect(input).toHaveValue('saltwater')
  await input.fill('')
  await expect(page.getByRole('option', { name: 'saltwater', exact: true })).toBeVisible()
})

test('manga page lists official sources as safe external links', async ({ page }) => {
  await visit(page, '/manga/9003/paper-moon-courier')
  const section = page.locator('#where-to-read')
  await expect(section.getByRole('heading', { name: 'Où lire' })).toBeVisible()
  const link = section.getByRole('link', { name: /Kite Reader/ }).first()
  await expect(link).toHaveAttribute('href', /^https:\/\/kite-reader\.example\//)
  await expect(link).toHaveAttribute('target', '_blank')
  await expect(link).toHaveAttribute('rel', /noopener/)
})

test('manga without official sources says so', async ({ page }) => {
  await visit(page, '/manga/9005/static-bloom')
  await expect(page.getByText('Aucune source officielle pour l’instant')).toBeVisible()
})

test('legacy and wrong slugs redirect permanently to the canonical URL', async ({ request }) => {
  const response = await request.get('/manga/9003/wrong-slug', { maxRedirects: 0 })
  expect(response.status()).toBe(301)
  expect(response.headers().location).toBe('/manga/9003/paper-moon-courier')
})

test('unknown titles render a 404 page', async ({ page }) => {
  const response = await visit(page, '/manga/123456/nothing')
  expect(response?.status()).toBe(404)
  await expect(page.getByRole('heading', { name: 'Cette page n’a jamais été imprimée.' })).toBeVisible()
})

test('creator pages list their works', async ({ page }) => {
  await visit(page, '/creator/7001/aoi-kirishima')
  await expect(page.getByRole('heading', { level: 1, name: 'Aoi Kirishima' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Saltwater Archive' })).toBeVisible()
})
