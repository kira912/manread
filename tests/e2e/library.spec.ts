import { expect, test } from '@playwright/test'
import { visit } from './helpers'

test('a title can be added, tracked, persisted and removed', async ({ page }) => {
  await visit(page, '/manga/9003/paper-moon-courier')
  await page.getByRole('button', { name: 'Ajouter à ma bibliothèque' }).click()
  await page.getByText('En lecture', { exact: true }).click()
  await page.getByRole('button', { name: 'Augmenter : dernier chapitre lu' }).click()
  await page.getByRole('button', { name: 'Augmenter : dernier chapitre lu' }).click()
  await expect(page.getByRole('textbox', { name: 'Dernier chapitre lu' })).toHaveValue('2')

  await page.reload()
  await expect(page.getByRole('textbox', { name: 'Dernier chapitre lu' })).toHaveValue('2')

  await visit(page, '/library')
  await expect(page.getByRole('heading', { level: 1, name: 'Votre bibliothèque' })).toBeVisible()
  await expect(page.getByRole('tab', { name: /En lecture\s*1/ })).toBeVisible()
  const row = page.getByRole('article').filter({ hasText: 'Paper Moon Courier' })
  await expect(row.getByText('Ch. 2 / 96')).toBeVisible()

  await row.getByRole('button', { name: 'Marquer le chapitre 3 de Paper Moon Courier comme lu' }).click()
  await expect(row.getByText('Ch. 3 / 96')).toBeVisible()

  await row.getByRole('button', { name: 'Retirer Paper Moon Courier de la bibliothèque' }).click()
  await expect(page.getByText('Vos étagères sont vides')).toBeVisible()
  await page.getByRole('button', { name: 'Annuler' }).click()
  await expect(page.getByRole('article').filter({ hasText: 'Paper Moon Courier' })).toBeVisible()
})

test('continue reading surfaces on the home page', async ({ page }) => {
  await visit(page, '/manga/9001/saltwater-archive')
  await page.getByRole('button', { name: 'Ajouter à ma bibliothèque' }).click()
  await page.getByRole('button', { name: 'Augmenter : dernier chapitre lu' }).click()
  await visit(page, '/')
  const section = page.getByRole('region', { name: 'Reprendre la lecture' })
  await expect(section).toBeVisible()
  await expect(section.getByText('Saltwater Archive')).toBeVisible()
})

test('viewing history is recorded and can be cleared', async ({ page }) => {
  await visit(page, '/manga/9004/the-concrete-garden')
  await expect(page.getByRole('button', { name: 'Ajouter à ma bibliothèque' })).toBeVisible()
  await visit(page, '/library?view=history')
  await expect(page.getByRole('link', { name: /The Concrete Garden/ })).toBeVisible()
  await page.getByRole('button', { name: 'Effacer l’historique' }).click()
  await expect(page.getByText('Aucune trace pour l’instant')).toBeVisible()
})
