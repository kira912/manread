import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { visit } from './helpers'

const CHAPTER_ONE = '/read/9001/manread-demo~saltwater-archive-c1'
const page = (n: number, total: number) => `Page ${n} of ${total}`

test('a manga with licensed chapters offers in-app reading with attribution', async ({ page: browser }) => {
  await visit(browser, '/manga/9001/saltwater-archive')
  const section = browser.locator('#read-here')
  await expect(section.getByRole('heading', { name: 'Read on Manread' })).toBeVisible()
  await expect(section.getByRole('link', { name: /What the tide returns/ })).toBeVisible()
  await expect(section.getByText(/© Manread demo studio/)).toBeVisible()
  await expect(section.getByRole('link', { name: 'CC0 1.0' })).toHaveAttribute('href', 'https://creativecommons.org/publicdomain/zero/1.0/')
})

test('titles without licensed chapters keep only official links', async ({ page: browser }) => {
  await visit(browser, '/manga/9003/paper-moon-courier')
  await expect(browser.locator('#read-here')).toHaveCount(0)
  await expect(browser.locator('#where-to-read')).toBeVisible()
})

test('reading a chapter with the keyboard, then continuing to the next one', async ({ page: browser, isMobile }) => {
  test.skip(isMobile, 'keyboard flow')
  await visit(browser, '/manga/9001/saltwater-archive')
  await browser.locator('#read-here').getByRole('link', { name: /Start reading/ }).click()
  await expect(browser).toHaveURL(CHAPTER_ONE)
  await expect(browser.getByRole('img', { name: page(1, 6) })).toBeVisible()

  await browser.keyboard.press('ArrowLeft')
  await expect(browser.getByRole('img', { name: page(2, 6) })).toBeVisible()
  await browser.keyboard.press('ArrowRight')
  await expect(browser.getByRole('img', { name: page(1, 6) })).toBeVisible()
  await browser.keyboard.press('End')
  await expect(browser.getByRole('img', { name: page(6, 6) })).toBeVisible()
  await browser.keyboard.press('Space')

  await expect(browser.getByRole('heading', { name: 'Keep going?' })).toBeVisible()
  await browser.getByRole('link', { name: /Chapter 2 — A letter, unsigned/ }).click()
  await expect(browser).toHaveURL(/saltwater-archive-c2$/)
  await expect(browser.getByRole('img', { name: page(1, 5) })).toBeVisible()

  await visit(browser, '/library')
  const row = browser.getByRole('article').filter({ hasText: 'Saltwater Archive' })
  await expect(row.getByText('Ch. 1')).toBeVisible()
  await expect(row.getByRole('link', { name: /Resume here/ })).toHaveAttribute('href', /saltwater-archive-c2$/)
})

test('the reader resumes at the exact page after a reload', async ({ page: browser, isMobile }) => {
  test.skip(isMobile, 'keyboard flow')
  await visit(browser, CHAPTER_ONE)
  await browser.keyboard.press('ArrowLeft')
  await browser.keyboard.press('ArrowLeft')
  await expect(browser.getByRole('img', { name: page(3, 6) })).toBeVisible()
  await expect.poll(() => browser.evaluate(() => localStorage.getItem('manread:reading-positions') ?? '')).toContain('"page":2')

  await visit(browser, CHAPTER_ONE)
  await expect(browser.getByRole('img', { name: page(3, 6) })).toBeVisible()
  await visit(browser, '/manga/9001/saltwater-archive')
  await expect(browser.locator('.manga__cta').getByRole('link', { name: 'Continue ch. 1 · p. 3' })).toBeVisible()
})

test('touch readers turn pages with taps and swipes in reading direction', async ({ page: browser, isMobile }) => {
  test.skip(!isMobile, 'touch flow')
  await visit(browser, CHAPTER_ONE)
  const stage = browser.locator('.paged')
  const box = (await stage.boundingBox())!
  const y = box.y + box.height / 2

  await browser.mouse.click(box.x + box.width * 0.1, y)
  await expect(browser.getByRole('img', { name: page(2, 6) })).toBeVisible()
  await browser.mouse.click(box.x + box.width * 0.9, y)
  await expect(browser.getByRole('img', { name: page(1, 6) })).toBeVisible()

  await browser.mouse.move(box.x + box.width * 0.3, y)
  await browser.mouse.down()
  await browser.mouse.move(box.x + box.width * 0.8, y, { steps: 5 })
  await browser.mouse.up()
  await expect(browser.getByRole('img', { name: page(2, 6) })).toBeVisible()
})

test('manhwa open as a vertical scroll and track progress while scrolling', async ({ page: browser }) => {
  await visit(browser, '/read/9007/manread-demo~late-bus-to-haneul-c1')
  await expect(browser.getByRole('img', { name: page(1, 4) })).toBeVisible()
  await expect(browser.getByRole('img', { name: page(4, 4) })).toBeAttached()
  await browser.getByRole('img', { name: page(4, 4) }).scrollIntoViewIfNeeded()
  await expect(browser.getByRole('heading', { name: /all caught up/ })).toBeVisible()
  await expect.poll(() => browser.evaluate(() => localStorage.getItem('manread:library') ?? '')).toContain('"chapter":1')
})

test('reader preferences can switch layout and persist', async ({ page: browser }) => {
  await visit(browser, CHAPTER_ONE)
  await browser.getByRole('button', { name: 'Reader settings' }).click()
  await browser.getByText('Vertical scroll', { exact: true }).click()
  await browser.getByRole('button', { name: 'Close settings' }).click()
  await expect(browser.getByRole('img', { name: page(6, 6) })).toBeAttached()
  await visit(browser, CHAPTER_ONE)
  await expect(browser.getByRole('img', { name: page(6, 6) })).toBeAttached()
})

test('unknown chapters and chapters of another title are 404', async ({ page: browser }) => {
  expect((await visit(browser, '/read/9001/manread-demo~nope'))?.status()).toBe(404)
  expect((await visit(browser, '/read/9003/manread-demo~saltwater-archive-c1'))?.status()).toBe(404)
})

test('chapter pages are served as immutable static files', async ({ request }) => {
  const chapter = await (await request.get('/api/reader/manread-demo~saltwater-archive-c1')).json()
  const pageResponse = await request.get(chapter.pages[0].url)
  expect(pageResponse.status()).toBe(200)
  expect(pageResponse.headers()['content-type']).toBe('image/webp')
  expect(pageResponse.headers()['cache-control']).toContain('immutable')
  expect((await request.get('/content/manread-demo/saltwater-archive-c1/999-deadbeef.webp')).status()).toBe(404)
})

test('the reader has no detectable WCAG A/AA violations', async ({ page: browser }) => {
  await visit(browser, CHAPTER_ONE)
  await browser.getByRole('button', { name: 'Reader settings' }).click()
  await expect(browser.getByRole('dialog', { name: 'Reader settings' })).toBeVisible()
  const results = await new AxeBuilder({ page: browser }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  expect(results.violations.map(violation => `${violation.id}: ${violation.nodes.map(node => node.target.join(' ')).slice(0, 3).join(' | ')}`)).toEqual([])
})
