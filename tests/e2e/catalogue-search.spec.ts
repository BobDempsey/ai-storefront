import { expect, test, type Page } from '@playwright/test'

/**
 * Searching the catalogue from the storefront. Free: nothing here touches the
 * assistant, and each test counts the POSTs to the chat route to keep it that
 * way, the same guard `ask-about-a-product.spec.ts` uses.
 *
 * The behaviours worth pinning are the ones a screenshot cannot tell apart: the
 * URL carrying the term, one Back leaving the page rather than replaying the
 * typing, and the per-tab counts agreeing with the lists under them.
 */

const SEARCH = '#catalogue-search'
const PALETTE = '#palette-search'

async function hydrated(page: Page) {
  await page.waitForLoadState('networkidle')
}

/** Counts requests for a completion. The GET availability check is not one. */
function countChatPosts(page: Page) {
  const posts: string[] = []
  page.on('request', request => {
    if (request.method() === 'POST' && request.url().includes('/api/chat')) {
      posts.push(request.url())
    }
  })
  return posts
}

const cards = (page: Page) => page.locator('article')

/**
 * Searching the way a visitor does from the shop page: the field beside the
 * heading is a launcher, so it opens the panel, the term is typed there, and
 * the "see all" row is what puts it in the address. Typing into the field
 * directly is what this replaced, and it is readonly now so an attempt hangs
 * rather than fails clearly.
 */
async function searchFromCatalogue(page: Page, termText: string) {
  await page.locator(SEARCH).click()
  await expect(page.locator(PALETTE)).toBeFocused()
  await page.locator(PALETTE).fill(termText)
  await page.getByTestId('palette-see-all').click()
}
/** The item rows, without the row that carries the term to the shop page. */
const paletteRows = (page: Page) =>
  page.locator('[data-testid="palette-results"] [role="option"]:not([data-testid="palette-see-all"])')

test('typing narrows the catalogue and puts the term in the URL', async ({ page }) => {
  const posts = countChatPosts(page)

  await page.goto('/')
  await hydrated(page)
  await expect(cards(page)).toHaveCount(9)

  await searchFromCatalogue(page, 'dragon')
  await expect(page).toHaveURL(/\?q=dragon$/)
  await expect(cards(page)).toHaveCount(2)
  // The card carries two links to the same product, the image and the name.
  await expect(
    page.getByRole('link', { name: 'Articulated Dragon', exact: true }).first()
  ).toBeVisible()

  expect(posts).toEqual([])
})

test('clearing the search restores the catalogue and the plain address', async ({ page }) => {
  await page.goto('/?q=dragon')
  await hydrated(page)
  await expect(cards(page)).toHaveCount(2)

  await page.getByLabel('Clear the search').click()

  await expect(cards(page)).toHaveCount(9)
  await expect(page).toHaveURL(/\/$/)
  await expect(page.locator(SEARCH)).toHaveValue('')
})

test('a searched address reproduces the search on load', async ({ page }) => {
  await page.goto('/?q=planter')
  await hydrated(page)

  await expect(page.locator(SEARCH)).toHaveValue('planter')
  await expect(cards(page)).toHaveCount(1)
})

test('each tab counts its own matches', async ({ page }) => {
  await page.goto('/?q=dragon')
  await hydrated(page)

  await expect(page.getByRole('tab', { name: /Products/ })).toContainText('1')
  await expect(page.getByRole('tab', { name: /Files/ })).toContainText('1')

  await searchFromCatalogue(page, 'planter')
  await expect(page.getByRole('tab', { name: /Products/ })).toContainText('1')
  await expect(page.getByRole('tab', { name: /Files/ })).toContainText('0')

  // The kind with no matches says so rather than showing an empty panel.
  await page.getByRole('tab', { name: /Files/ }).click()
  await expect(page.getByText('No files match "planter"')).toBeVisible()
})

test('a term that matches nothing says so and offers to clear', async ({ page }) => {
  await page.goto('/')
  await hydrated(page)

  await searchFromCatalogue(page, 'zzzznothing')

  await expect(page.getByText('Nothing in the catalogue matches "zzzznothing"')).toBeVisible()
  await page.getByRole('button', { name: 'Clear the search' }).click()
  await expect(cards(page)).toHaveCount(9)
})

test('the navbar control opens the quick search panel over the page', async ({ page }) => {
  const posts = countChatPosts(page)

  await page.goto('/cart')
  await hydrated(page)
  await page.getByTestId('nav-search').click()

  // Over the page, not instead of it: the visitor stays where they were.
  await expect(page).toHaveURL(/\/cart$/)
  await expect(page.locator(PALETTE)).toBeFocused()

  // The catalogue is listed before a key is pressed, which is the point of it.
  await expect(paletteRows(page).first()).toBeVisible()
  await expect(page.getByTestId('palette-see-all')).toContainText('Browse all')

  expect(posts).toEqual([])
})

test('typing in the panel narrows it and Enter opens the highlighted item', async ({ page }) => {
  await page.goto('/cart')
  await hydrated(page)
  await page.getByTestId('nav-search').click()

  await page.locator(PALETTE).fill('dice')
  await expect(paletteRows(page)).toHaveCount(2)

  // The field keeps focus while the highlight moves, so typing never stops.
  await page.locator(PALETTE).press('ArrowDown')
  await page.locator(PALETTE).press('Enter')

  await expect(page).toHaveURL(/\/products\/hex-dice-tower-model$/)
})

test('the panel hands a term to the catalogue page', async ({ page }) => {
  await page.goto('/cart')
  await hydrated(page)
  await page.getByTestId('nav-search').click()

  await page.locator(PALETTE).fill('dragon')
  await page.getByTestId('palette-see-all').click()

  await expect(page).toHaveURL(/\?q=dragon$/)
  await expect(page.locator(SEARCH)).toHaveValue('dragon')
  await expect(cards(page)).toHaveCount(2)
})

test('a term the panel cannot match says so', async ({ page }) => {
  await page.goto('/')
  await hydrated(page)
  await page.getByTestId('nav-search').click()

  await page.locator(PALETTE).fill('zzzznothing')
  await expect(page.getByText('Nothing in the catalogue matches "zzzznothing"')).toBeVisible()
})

test('Escape closes the panel without searching anything', async ({ page }) => {
  await page.goto('/cart')
  await hydrated(page)
  await page.getByTestId('nav-search').click()
  await expect(page.locator(PALETTE)).toBeVisible()

  await page.locator(PALETTE).press('Escape')

  await expect(page.locator(PALETTE)).toBeHidden()
  await expect(page).toHaveURL(/\/cart$/)
})

test('one Back leaves the page rather than replaying the typing', async ({ page }) => {
  await page.goto('/products/hex-dice-tower')
  await hydrated(page)
  // By where the link goes, not by what it says: the header link is the shop's
  // own name, so naming one here passes on the template and fails on every
  // shop built from it.
  await page.locator('header a[href="/"]').click()
  await expect(page.locator(SEARCH)).toBeVisible()

  // One history entry for the whole search, not one per keystroke, which is
  // what this actually catches. Typed a letter at a time on purpose.
  await page.locator(SEARCH).click()
  await page.locator(PALETTE).pressSequentially('bins')
  await page.getByTestId('palette-see-all').click()
  await expect(page).toHaveURL(/\?q=bins$/)

  // Taking a term to the shop page is a deliberate step, the way paging is, so
  // it pushes and one Back undoes exactly it: the unsearched shop page. A
  // second Back then leaves for the product page. Four letters, two entries.
  await page.goBack()
  await expect(page).toHaveURL(/\/$/)
  await page.goBack()
  await expect(page).toHaveURL(/\/products\/hex-dice-tower$/)
})

test('searching leaves the cart alone', async ({ page }) => {
  await page.goto('/')
  await hydrated(page)
  await page.getByRole('button', { name: 'Add to cart' }).first().click()

  const badge = page.getByLabel('Cart').locator('.p-badge')
  await expect(badge).toHaveText('1')

  await searchFromCatalogue(page, 'dragon')
  await expect(cards(page)).toHaveCount(2)
  await expect(badge).toHaveText('1')

  await page.getByLabel('Clear the search').click()
  await expect(badge).toHaveText('1')
})
