import { expect, type Locator, type Page } from '@playwright/test'

export async function clickUntilVisible(trigger: Locator, target: Locator) {
  await expect(async () => {
    if (!(await target.isVisible())) await trigger.click()
    await expect(target).toBeVisible({ timeout: 1_000 })
  }).toPass({ timeout: 15_000 })
}

export async function openSearch(page: Page) {
  const input = page.getByRole('combobox', { name: 'Rechercher des titres et des auteurs' })
  await clickUntilVisible(page.getByRole('button', { name: /^Recherche/ }), input)
  return input
}

export async function visit(page: Page, url: string) {
  const response = await page.goto(url)
  await page.locator('html[data-ready="true"]').waitFor({ state: 'attached' })
  return response
}
