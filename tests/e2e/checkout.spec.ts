import { expect, test, type Page } from '@playwright/test'
import { TEST_ORDER_TOKEN, db, deleteOrders, uniqueEmail } from '../db/client'

/**
 * Walks the storefront the way a customer does. The browser sends the
 * test-order token on every request, so the orders these place are marked
 * `is_test` and never reach the staff inbox, and which exempts them from the
 * order rate limit so a second run in the same ten minutes still passes.
 */

const created: string[] = []

test.beforeAll(() => {
  if (!TEST_ORDER_TOKEN) {
    throw new Error('NUXT_TEST_ORDER_TOKEN is not set in .env; these would email staff')
  }
})

test.beforeEach(async ({ context }) => {
  await context.setExtraHTTPHeaders({ 'x-test-order-token': TEST_ORDER_TOKEN })
})

test.afterAll(async () => {
  await deleteOrders(created.splice(0))
})

/**
 * Waits until Vue has hydrated the page.
 *
 * Nuxt server-renders the markup, so every button is visible and clickable
 * before any listener is attached to it. Playwright clicks the moment the
 * element appears, and a click that lands in that gap does nothing at all: no
 * store update, no cart cookie, and /checkout then bounces to /cart. Waiting
 * for the network to settle is what closes the gap.
 */
async function hydrated(page: Page) {
  await page.waitForLoadState('networkidle')
}

/** Puts a product in the cart and opens the checkout with the form filled in. */
async function startCheckout(page: Page, email: string) {
  await page.goto('/')
  await hydrated(page)
  await page.getByRole('button', { name: 'Add to cart' }).first().click()

  // The cart is persisted to a cookie, so it only proves the click registered
  // once the cookie exists.
  await expect
    .poll(async () => (await page.context().cookies()).some(c => c.name === 'cart'), {
      timeout: 10_000
    })
    .toBe(true)

  await page.goto('/checkout')
  await hydrated(page)
  // An empty cart sends /checkout to /cart, so failing here is clearer than a
  // detached-element timeout further down.
  await expect(page).toHaveURL(/\/checkout$/)

  await page.locator('#name').fill('E2E Checkout')
  await page.locator('#email').fill(email)
}

/** Reads the id out of the confirmation URL and remembers it for teardown. */
async function orderIdFromConfirmation(page: Page) {
  await page.waitForURL(/\/order-received\?/)
  const id = new URL(page.url()).searchParams.get('id')
  expect(id).toBeTruthy()
  created.push(id!)
  return id!
}

test('a customer can take a product from the catalogue through to a placed order', async ({
  page
}) => {
  const email = uniqueEmail('e2e-happy')

  await startCheckout(page, email)
  await page.getByRole('button', { name: 'Submit order' }).click()

  const id = await orderIdFromConfirmation(page)

  const { data: order } = await db()
    .from('orders')
    .select('customer_email, total_cents, is_test')
    .eq('id', id)
    .single()

  expect(order!.customer_email).toBe(email)
  expect(order!.total_cents).toBeGreaterThan(0)
  // Marked, so this run never emailed staff and teardown can find it.
  expect(order!.is_test).toBe(true)

  const { data: items } = await db().from('order_items').select('id').eq('order_id', id)
  expect(items!.length).toBeGreaterThan(0)
})

/**
 * The regression behind commit 6c70104: a rejected code used to stay in the
 * field, so the next Submit resent it and the order failed again.
 */
test('a rejected promo code clears, and the next submit places the order', async ({ page }) => {
  const email = uniqueEmail('e2e-promo')

  await startCheckout(page, email)

  const promo = page.locator('#promo')
  await promo.fill('NOT-A-REAL-CODE')
  await page.getByRole('button', { name: 'Apply' }).click()

  // The page says why, and the field is emptied rather than left holding a code
  // the server has already refused.
  await expect(page.locator('#promo-message')).toBeVisible()
  await expect(promo).toHaveValue('')

  await page.getByRole('button', { name: 'Submit order' }).click()

  const id = await orderIdFromConfirmation(page)

  const { data: order } = await db()
    .from('orders')
    .select('promo_code_snapshot, discount_source, is_test')
    .eq('id', id)
    .single()

  // The refused code reached neither the order nor a second request.
  expect(order!.promo_code_snapshot).toBeNull()
  expect(order!.is_test).toBe(true)
})
