import { expect, test, type Page } from '@playwright/test'

/**
 * Paging the catalogue. Free: nothing here touches the assistant.
 *
 * What is worth pinning is what a screenshot cannot tell apart: the address
 * describing the page, Back stepping between pages rather than doing nothing,
 * the two tabs paging independently, and a search dropping the visitor back to
 * the first page rather than onto an empty one.
 */

const SEARCH = '#catalogue-search'
const PRODUCTS = '[data-testid="products-paginator"]'
const FILES = '[data-testid="files-paginator"]'

async function hydrated(page: Page) {
  await page.waitForLoadState('networkidle')
}

/** The product cards in the tab currently on screen. */
const names = (page: Page) =>
  page.locator('[role="tabpanel"]:visible article a.font-medium')

const pageButton = (page: Page, n: number) =>
  page.locator(`${PRODUCTS} .p-paginator-page`).getByText(String(n), { exact: true })

test('the catalogue arrives one page at a time', async ({ page }) => {
  await page.goto('/')
  await hydrated(page)

  await expect(names(page)).toHaveCount(6)
  await expect(page.locator(PRODUCTS)).toBeVisible()
})

test('a second page holds different items and says so in the address', async ({ page }) => {
  await page.goto('/')
  await hydrated(page)
  const first = await names(page).allTextContents()

  await pageButton(page, 2).click()

  await expect(page).toHaveURL(/\?page=2$/)
  // Retried rather than read once: the page's items arrive with the next
  // request, a moment after the address changes.
  await expect(names(page).first()).not.toHaveText(first[0]!)

  const second = await names(page).allTextContents()
  for (const name of second) expect(first).not.toContain(name)
})

test('a reloaded page number shows the same page', async ({ page }) => {
  await page.goto('/?page=2')
  await hydrated(page)
  const second = await names(page).allTextContents()

  await page.reload()
  await hydrated(page)

  expect(await names(page).allTextContents()).toEqual(second)
})

test('Back steps between pages, and the first page drops the number', async ({ page }) => {
  await page.goto('/')
  await hydrated(page)

  await pageButton(page, 2).click()
  await expect(page).toHaveURL(/\?page=2$/)

  await page.goBack()
  await expect(page).toHaveURL(/\/$/)
  await expect(names(page).first()).toBeVisible()
})

test('the files tab does not page while it fits on one page', async ({ page }) => {
  await page.goto('/')
  await hydrated(page)

  await page.getByRole('tab', { name: /Files/ }).click()
  await expect(page.locator(FILES)).toBeHidden()
})

test('paging the products leaves the files where they were', async ({ page }) => {
  await page.goto('/')
  await hydrated(page)

  await page.getByRole('tab', { name: /Files/ }).click()
  const files = await names(page).allTextContents()

  await page.getByRole('tab', { name: /Products/ }).click()
  await pageButton(page, 2).click()
  await expect(page).toHaveURL(/\?page=2$/)

  await page.getByRole('tab', { name: /Files/ }).click()
  expect(await names(page).allTextContents()).toEqual(files)
})

test('searching from a later page starts again at the first', async ({ page }) => {
  await page.goto('/?page=2')
  await hydrated(page)

  await page.locator(SEARCH).fill('cable')

  await expect(page).toHaveURL(/\?q=cable$/)
  await expect(page.getByRole('tab', { name: /Products/ })).toContainText('3')
})

test('a search counts every match, not the ones on the page', async ({ page }) => {
  await page.goto('/?q=p')
  await hydrated(page)

  // More matches than a page holds: the tab's count is the whole number.
  const count = Number(
    (await page.getByRole('tab', { name: /Products/ }).textContent())!.replace(/\D/g, '')
  )
  expect(count).toBeGreaterThan(6)
  await expect(names(page)).toHaveCount(6)
  await expect(page.locator(PRODUCTS)).toBeVisible()
})
