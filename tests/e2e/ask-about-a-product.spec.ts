import { expect, test, type Page } from '@playwright/test'

/**
 * The product page's own way into the assistant. Everything here is free: the
 * question is put in the box and left there, so no completion is ever requested
 * and this test belongs in the ordinary suite rather than the paid one.
 *
 * What is worth pinning is the not-sending. A control that opened the panel and
 * fired the question would look identical in a screenshot and would spend one
 * of the day's 75 requests on every accidental click, so each test below counts
 * the POSTs to the chat route and expects none.
 */

const PRODUCT = '/products/hex-dice-tower'
const QUESTION = 'Tell me more about the Hex Dice Tower.'

async function hydrated(page: Page) {
  await page.waitForLoadState('networkidle')
}

const messageBox = (page: Page) =>
  page.getByRole('textbox', { name: 'Message the AI Shop Assistant' })

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

test('a question about the product lands in the box, unsent', async ({ page }) => {
  const posts = countChatPosts(page)

  await page.goto(PRODUCT)
  await hydrated(page)
  await page.getByRole('button', { name: 'Ask about this' }).click()

  await expect(messageBox(page)).toHaveValue(QUESTION)
  await expect(messageBox(page)).toBeFocused()

  // No message has been exchanged, so the greeting is still what fills the
  // panel. This is the line between a filled box and a sent question.
  await expect(page.getByText(/Hi, I'm the shop assistant/)).toBeVisible()
  expect(posts).toHaveLength(0)

  // The visitor is still on the product page, with the page behind the panel.
  await expect(page).toHaveURL(new RegExp(`${PRODUCT}$`))
  await expect(page.getByRole('heading', { name: 'Hex Dice Tower' })).toBeVisible()
})

test('a half-typed message is not overwritten', async ({ page }) => {
  const posts = countChatPosts(page)

  await page.goto(PRODUCT)
  await hydrated(page)

  await page.getByRole('button', { name: 'Open the shop assistant' }).click()
  await messageBox(page).fill('what is it made of')
  await page.keyboard.press('Escape')
  await expect(messageBox(page)).toBeHidden()

  await page.getByRole('button', { name: 'Ask about this' }).click()

  await expect(messageBox(page)).toHaveValue('what is it made of')
  expect(posts).toHaveLength(0)
})

test('a second product can be asked about mid-conversation', async ({ page }) => {
  // The reply is faked, so this stays in the free suite. What is under test is
  // the drawer's guard, not the model.
  await page.route('**/api/chat', async route => {
    if (route.request().method() !== 'POST') return route.continue()
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ reply: 'It is a translucent PLA panel.', intents: [], draft: null })
    })
  })

  await page.goto('/products/lithophane-night-lamp')
  await hydrated(page)
  await page.getByRole('button', { name: 'Ask about this' }).click()
  await expect(messageBox(page)).toHaveValue('Tell me more about the Lithophane Night Lamp.')
  await page.getByRole('button', { name: 'Send' }).click()
  await expect(page.getByText('It is a translucent PLA panel.')).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(messageBox(page)).toBeHidden()

  // In-app navigation, which is what keeps the conversation alive: a full page
  // load rebuilds the store and the conversation goes with it.
  await page.getByRole('link', { name: 'All products' }).click()
  await hydrated(page)
  await page.getByRole('link', { name: 'Hex Dice Tower' }).first().click()
  await hydrated(page)
  await page.getByRole('button', { name: 'Ask about this' }).click()

  await expect(messageBox(page)).toHaveValue(QUESTION)
  await expect(page.getByText('It is a translucent PLA panel.')).toBeVisible()
})

test('the wait says Thinking, then Almost there', async ({ page }) => {
  // Held open long enough to watch the label turn, and answered locally, so
  // this costs nothing either.
  await page.route('**/api/chat', async route => {
    if (route.request().method() !== 'POST') return route.continue()
    await new Promise(resolve => setTimeout(resolve, 5000))
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ reply: 'We have one.', intents: [], draft: null })
    })
  })

  await page.goto(PRODUCT)
  await hydrated(page)
  await page.getByRole('button', { name: 'Ask about this' }).click()
  await page.getByRole('button', { name: 'Send' }).click()

  const waiting = page.getByRole('status')
  await expect(waiting).toHaveText('Thinking')
  await expect(waiting).toHaveText('Almost there', { timeout: 5000 })
  await expect(page.getByText('We have one.')).toBeVisible()
  await expect(waiting).toBeHidden()
})

test('the question does not follow the visitor to the next product', async ({ page }) => {
  const posts = countChatPosts(page)

  await page.goto(PRODUCT)
  await hydrated(page)
  await page.getByRole('button', { name: 'Ask about this' }).click()
  await expect(messageBox(page)).toHaveValue(QUESTION)

  // Clearing the box is the visitor deciding to ask something else. Opening
  // from the navbar afterwards must not put the old question back.
  await messageBox(page).fill('')
  await page.keyboard.press('Escape')
  await expect(messageBox(page)).toBeHidden()

  await page.getByRole('button', { name: 'Open the shop assistant' }).click()

  await expect(messageBox(page)).toHaveValue('')
  expect(posts).toHaveLength(0)
})
