import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { openSearch, visit } from './helpers'

const PAGES = ['/', '/manga/9003/paper-moon-courier', '/search?genre=Drama', '/genre/fantasy', '/creator/7001/aoi-kirishima', '/library', '/about']

for (const path of PAGES) {
  test(`${path} has no detectable WCAG A/AA violations`, async ({ page }) => {
    await visit(page, path)
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
    expect(results.violations.map(violation => `${violation.id}: ${violation.nodes.map(node => node.target.join(' ')).slice(0, 3).join(' | ')}`)).toEqual([])
  })
}

test('the open search palette is accessible', async ({ page }) => {
  await visit(page, '/')
  const input = await openSearch(page)
  await input.fill('fox')
  await expect(page.getByRole('option').first()).toBeVisible()
  const results = await new AxeBuilder({ page }).include('dialog').withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(results.violations.map(violation => violation.id)).toEqual([])
})
