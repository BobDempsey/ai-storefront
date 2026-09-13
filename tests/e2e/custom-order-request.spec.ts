import { expect, test, type Page } from '@playwright/test'

/**
 * The way out of an empty search. A visitor who searched for something the shop
 * does not stock is offered the contact form with their term already written,
 * and the request goes out on the ordinary contact path.
 *
 * Free, and pinned as free: the offer is a link between two pages of the
 * storefront and must never reach the model, so every test here counts the
 * POSTs to the chat route and expects none, the same guard
 * `ask-about-a-product.spec.ts` uses.
 *
 * The send itself is answered locally. The dev server would hand a real request
 * to Resend, and what is under test is what the browser sends and what the
 * visitor is then told, neither of which needs a message to actually leave.
 */

const SEARCH = '#catalogue-search'
const PALETTE = '#palette-search'
const TERM = 'titanium dragon'

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

/** Searches from the shop page, where the field is a launcher for the panel. */
async function searchFromCatalogue(page: Page, termText: string) {
  await page.locator(SEARCH).click()
  await expect(page.locator(PALETTE)).toBeFocused()
  await page.locator(PALETTE).fill(termText)
  await page.getByTestId('palette-see-all').click()
}

// Exact names throughout: the page also carries the newsletter block's own
// email field and the drawer's message box, and a loose label matches those.
const field = (page: Page, name: string) => page.getByRole('textbox', { name, exact: true })
const messageBox = (page: Page) => field(page, 'Message')
const offer = (page: Page) => page.getByTestId('ask-about-this')

test('an empty search offers the request, and the term travels with it', async ({ page }) => {
  const posts = countChatPosts(page)

  await page.goto('/')
  await hydrated(page)
  await searchFromCatalogue(page, TERM)

  await expect(page.getByText(`Nothing in the catalogue matches "${TERM}"`)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Clear the search' })).toBeVisible()
  await offer(page).click()

  await expect(page).toHaveURL(/\/contact$/)
  await expect(messageBox(page)).toHaveValue(new RegExp(TERM))
  // The form says what it is, and says it commits the shop to nothing.
  await expect(page.getByTestId('custom-order-note')).toBeVisible()

  // Editable, not a fixed request: the term is a starting point.
  await messageBox(page).fill(`I'm looking for: ${TERM}, about 20cm tall`)
  await expect(messageBox(page)).toHaveValue(/20cm tall/)

  expect(posts).toEqual([])
})

test('the term is not in the address, and a reload does not put it back', async ({ page }) => {
  await page.goto('/')
  await hydrated(page)
  await searchFromCatalogue(page, TERM)
  await offer(page).click()
  await expect(messageBox(page)).toHaveValue(new RegExp(TERM))

  // A shareable address: nothing in it says what the visitor was shopping for.
  expect(new URL(page.url()).search).toBe('')

  await page.reload()
  await hydrated(page)

  await expect(messageBox(page)).toHaveValue('')
  await expect(page.getByTestId('custom-order-note')).toBeHidden()
})

test('a search that matches something offers nothing, because the shop answered', async ({
  page
}) => {
  const posts = countChatPosts(page)

  await page.goto('/?q=dragon')
  await hydrated(page)

  await expect(page.locator('article').first()).toBeVisible()
  await expect(offer(page)).toBeHidden()

  expect(posts).toEqual([])
})

test('a sent request goes out marked, and creates no order', async ({ page }) => {
  const posts = countChatPosts(page)
  const bodies: Array<Record<string, unknown>> = []
  const orderPosts: string[] = []

  page.on('request', request => {
    if (request.method() === 'POST' && request.url().includes('/api/orders')) {
      orderPosts.push(request.url())
    }
  })

  await page.route('**/api/contact', async route => {
    if (route.request().method() !== 'POST') return route.continue()
    bodies.push(route.request().postDataJSON() as Record<string, unknown>)
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ sent: true })
    })
  })

  await page.goto('/')
  await hydrated(page)
  await searchFromCatalogue(page, TERM)
  await offer(page).click()

  await field(page, 'Name').fill('Ada Lovelace')
  await field(page, 'Email').fill('ada@example.com')
  await page.getByRole('button', { name: 'Send message' }).click()

  await expect(page.getByText('Message sent')).toBeVisible()
  expect(bodies).toHaveLength(1)
  expect(bodies[0]).toMatchObject({ kind: 'custom-order' })
  expect(String(bodies[0]!.message)).toContain(TERM)
  expect(orderPosts).toEqual([])
  expect(posts).toEqual([])
})

test('a request that cannot be delivered says so and leaves the form filled', async ({ page }) => {
  await page.route('**/api/contact', async route => {
    if (route.request().method() !== 'POST') return route.continue()
    await route.fulfill({
      status: 502,
      contentType: 'application/json',
      body: JSON.stringify({
        statusMessage: 'Your message could not be sent. Please try again in a moment.'
      })
    })
  })

  await page.goto('/')
  await hydrated(page)
  await searchFromCatalogue(page, TERM)
  await offer(page).click()

  await field(page, 'Name').fill('Ada Lovelace')
  await field(page, 'Email').fill('ada@example.com')
  await page.getByRole('button', { name: 'Send message' }).click()

  // Nothing is stored, so a failed send has to be visible and the visitor's
  // words have to still be there to send again.
  await expect(page.getByText(/could not be sent/i)).toBeVisible()
  await expect(page.getByText('Message sent')).toBeHidden()
  await expect(messageBox(page)).toHaveValue(new RegExp(TERM))
})
