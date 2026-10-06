import { expect, test } from '@playwright/test'
import { visit } from './helpers'

test('a title can be added, tracked, persisted and removed', async ({ page }) => {
  await visit(page, '/manga/9003/paper-moon-courier')
  await page.getByRole('button', { name: 'Add to library' }).click()
  await page.getByText('Reading', { exact: true }).click()
  await page.getByRole('button', { name: 'Increase last chapter read' }).click()
  await page.getByRole('button', { name: 'Increase last chapter read' }).click()
  await expect(page.getByRole('textbox', { name: 'Last chapter read' })).toHaveValue('2')

  await page.reload()
  await expect(page.getByRole('textbox', { name: 'Last chapter read' })).toHaveValue('2')

  await visit(page, '/library')
  await expect(page.getByRole('heading', { level: 1, name: 'Your library' })).toBeVisible()
  await expect(page.getByRole('tab', { name: /Reading\s*1/ })).toBeVisible()
  const row = page.getByRole('article').filter({ hasText: 'Paper Moon Courier' })
  await expect(row.getByText('Ch. 2 / 96')).toBeVisible()

  await row.getByRole('button', { name: 'Mark chapter 3 of Paper Moon Courier as read' }).click()
  await expect(row.getByText('Ch. 3 / 96')).toBeVisible()

  await row.getByRole('button', { name: 'Remove Paper Moon Courier from library' }).click()
  await expect(page.getByText('Your shelves are empty')).toBeVisible()
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(page.getByRole('article').filter({ hasText: 'Paper Moon Courier' })).toBeVisible()
})

test('continue reading surfaces on the home page', async ({ page }) => {
  await visit(page, '/manga/9001/saltwater-archive')
  await page.getByRole('button', { name: 'Add to library' }).click()
  await page.getByRole('button', { name: 'Increase last chapter read' }).click()
  await visit(page, '/')
  const section = page.getByRole('region', { name: 'Continue reading' })
  await expect(section).toBeVisible()
  await expect(section.getByText('Saltwater Archive')).toBeVisible()
})

test('viewing history is recorded and can be cleared', async ({ page }) => {
  await visit(page, '/manga/9004/the-concrete-garden')
  await expect(page.getByRole('button', { name: 'Add to library' })).toBeVisible()
  await visit(page, '/library?view=history')
  await expect(page.getByRole('link', { name: /The Concrete Garden/ })).toBeVisible()
  await page.getByRole('button', { name: 'Clear history' }).click()
  await expect(page.getByText('No footprints yet')).toBeVisible()
})
