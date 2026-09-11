import { expect, test, type Page } from '@playwright/test'
import { TEST_ORDER_TOKEN, db, deleteOrders, uniqueEmail } from '../db/client'

/**
 * A promo code entered on the draft card, in a real browser, through to a
 * placed order.
 *
 * Tagged `@llm` and excluded from `npm run test:e2e`, because getting a draft
 * card on screen means the assistant has to draft one, and that is a real
 * provider call. The rest of the browser suite is free and stays that way;
 * run this with `npm run test:e2e:llm`.
 *
 * It is written to spend exactly one call: the cart is filled by clicking, for
 * nothing, and a single message asks for the order outright rather than
 * holding a conversation.
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

/** Nuxt server-renders before hydrating, so a click can land on dead markup. */
async function hydrated(page: Page) {
  await page.waitForLoadState('networkidle')
}

test('@llm a code entered on the draft card prices and redeems the order', async ({ page }) => {
  const email = uniqueEmail('e2e-drawer-promo')

  const { data: code } = await db()
    .from('promo_codes')
    .select('code, percent')
    .eq('active', true)
    .limit(1)
    .single()
  const promoCode = code!.code as string

  // Free: fill the cart by clicking, the way the other browser test does.
  await page.goto('/')
  await hydrated(page)
  await page.getByRole('button', { name: 'Add to cart' }).first().click()
  await expect
    .poll(async () => (await page.context().cookies()).some(c => c.name === 'cart'), {
      timeout: 10_000
    })
    .toBe(true)

  // The one provider call: everything the draft needs, in a single message.
  await page.getByRole('button', { name: 'Open the shop assistant' }).click()
  await page
    .getByPlaceholder(/ask/i)
    .or(page.locator('textarea, input[type="text"]').last())
    .first()
    .fill(`Please order what is in my cart. My name is E2E Drawer and my email is ${email}.`)
  await page.keyboard.press('Enter')

  const draft = page.getByText('Review your order')
  await expect(draft).toBeVisible({ timeout: 90_000 })

  // The promo field is the visitor's, not the assistant's: nothing about the
  // code passes through the conversation.
  const promoField = page.getByPlaceholder('Promo code (optional)')
  await promoField.fill(promoCode)
  await page.getByRole('button', { name: 'Apply' }).click()

  await expect(page.getByText(/Code applied\./)).toBeVisible({ timeout: 15_000 })
  // The tag beside the total, not the success message, which carries the same
  // percentage and would make a bare text match ambiguous.
  await expect(page.locator('.p-tag').filter({ hasText: `${code!.percent}% off` })).toBeVisible()

  await page.getByRole('button', { name: 'Confirm order' }).click()
  await expect(page.getByText(/Order received/)).toBeVisible({ timeout: 30_000 })

  const { data: order } = await db()
    .from('orders')
    .select('id, total_cents, subtotal_cents, discount_source, promo_code_snapshot, is_test')
    .eq('customer_email', email)
    .single()
  created.push(order!.id)

  expect(order!.is_test).toBe(true)
  expect(order!.discount_source).toBe('code')
  expect(order!.promo_code_snapshot).toBe(promoCode)
  expect(order!.total_cents).toBeLessThan(order!.subtotal_cents!)

  const { data: redemptions } = await db()
    .from('promo_redemptions')
    .select('id')
    .eq('order_id', order!.id)
  expect(redemptions).toHaveLength(1)
})
