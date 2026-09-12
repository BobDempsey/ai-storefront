import { expect, test, type ConsoleMessage, type Page } from '@playwright/test'

/**
 * The browser console stays quiet on the pages a visitor actually loads.
 *
 * This exists because of one real bug that reached production and that no
 * other test could see. PrimeVue's TabList starts with `isNextButtonEnabled`
 * true and corrects it in `updateButtonState()`, which measures the rendered
 * list and so cannot run on the server. SSR therefore shipped a scroll arrow
 * the client removed on mount, and every page load logged "Hydration completed
 * but contains mismatches". The page looked right, every assertion passed, and
 * the only symptom was in a console nobody was reading.
 *
 * A hydration mismatch is worth failing a build over rather than tolerating:
 * Vue gives up on patching the mismatched subtree and re-renders it, so the
 * cost is real work on every load, and the next mismatch may be one that
 * throws away state rather than a button nobody clicks.
 *
 * Free: nothing here touches the assistant.
 */

/**
 * Warnings we do not control and would rather see than silence elsewhere.
 * Keep this list short, and never add a hydration message to it.
 */
const IGNORED = [
  // Vue Router reports these for a link the app deliberately renders, and the
  // page still works. Added only so a real error is not lost in the noise.
  /Failed to load resource/i
]

function collect(page: Page) {
  const messages: string[] = []
  page.on('console', (message: ConsoleMessage) => {
    if (message.type() !== 'error' && message.type() !== 'warning') return
    const text = message.text()
    if (IGNORED.some(pattern => pattern.test(text))) return
    messages.push(`[${message.type()}] ${text}`)
  })
  page.on('pageerror', error => messages.push(`[pageerror] ${error.message}`))
  return messages
}

const PAGES: Array<[name: string, path: string]> = [
  ['the catalogue', '/'],
  ['a product page', '/products/articulated-dragon'],
  ['the cart', '/cart'],
  ['the contact form', '/contact']
]

for (const [name, path] of PAGES) {
  test(`${name} loads without a console error or a hydration mismatch`, async ({ page }) => {
    const messages = collect(page)

    await page.goto(path)
    // Hydration reports itself after the app mounts, not on load, so waiting
    // for the network to settle is what makes this assertion mean anything.
    await page.waitForLoadState('networkidle')

    expect(messages, `console output on ${path}`).toEqual([])
  })
}

test('the catalogue hydrates the tab strip without swapping nodes', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // The specific regression: PrimeVue's scroll arrows are off, so the server
  // and the browser agree about the tab strip rather than differing by one
  // button. Asserting the count on both sides is what a console check alone
  // would miss if Vue ever stopped reporting the mismatch.
  const server = await page.evaluate(async () => {
    const response = await fetch(location.href, { cache: 'no-store' })
    const parsed = new DOMParser().parseFromString(await response.text(), 'text/html')
    return parsed.querySelectorAll('.p-tablist-nav-button').length
  })
  const browser = await page.locator('.p-tablist-nav-button').count()

  expect(server).toBe(0)
  expect(browser).toBe(server)
})
