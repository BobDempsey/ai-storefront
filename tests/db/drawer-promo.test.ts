import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { BASE_URL, TEST_ORDER_TOKEN, db, deleteOrders, uniqueEmail } from './client'

/**
 * A promo code entered on the assistant panel's draft card has to reach the
 * shop as the same order a code entered at checkout produces. The panel posts
 * to the same route with the same fields, so what is worth proving is that the
 * two really do land identically, and that one redemption is one redemption
 * whichever field it was typed into.
 *
 * The drawer also sends a `confirmation` it was handed beside the draft. These
 * tests leave it out: a real one is minted in the dev server's own memory by a
 * chat call, so obtaining one costs a provider request, and the route's
 * handling of it is already covered. The code, the cart and the customer are
 * what this change touches.
 */

const CODE = 'WELCOME25'

let productId: string
const created: string[] = []

const post = (body: unknown) =>
  fetch(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-test-order-token': TEST_ORDER_TOKEN
    },
    body: JSON.stringify(body)
  })

/** Places one order and records its id for teardown. */
async function place(email: string, promoCode?: string) {
  const response = await post({
    customer: { name: 'Drawer Promo Test', email },
    items: [{ productId, quantity: 1 }],
    promoCode
  })
  const body = (await response.json()) as {
    orderId?: string
    data?: { promoStatus?: string }
  }
  if (body.orderId) created.push(body.orderId)
  return { status: response.status, body }
}

async function readOrder(id: string) {
  const { data } = await db()
    .from('orders')
    .select('total_cents, subtotal_cents, discount_source, discount_percent, promo_code_snapshot')
    .eq('id', id)
    .single()
  return data!
}

beforeAll(async () => {
  if (!TEST_ORDER_TOKEN) {
    throw new Error('NUXT_TEST_ORDER_TOKEN is not set in .env; these would email staff')
  }

  const health = await fetch(`${BASE_URL}/api/products`).catch(() => null)
  if (!health?.ok) {
    throw new Error(`no dev server answering at ${BASE_URL}; run "npm run dev" first`)
  }

  // Note the price this returns is already sale-discounted when a sale is on,
  // where subtotal_cents on the order is the catalogue price. So the id is all
  // that is taken from here; the figures come from the committed rows.
  const { items } = (await health.json()) as { items: { id: string; kind: string }[] }
  productId = items.find(p => p.kind === 'physical')!.id

  const { data: code } = await db()
    .from('promo_codes')
    .select('active')
    .eq('code', CODE)
    .maybeSingle()
  if (!code?.active) {
    throw new Error(`${CODE} is not an active promo code; these tests need it`)
  }
})

afterEach(async () => {
  await deleteOrders(created.splice(0))
})

describe('a code entered on the draft card', () => {
  it('prices and records exactly as the same code entered at checkout', async () => {
    // Two addresses, because one address may redeem a code once. What is being
    // compared is the resulting order, not who placed it.
    const fromCheckout = await place(uniqueEmail('drawer-promo-checkout'), CODE)
    const fromDrawer = await place(uniqueEmail('drawer-promo-drawer'), CODE)

    expect(fromCheckout.status).toBe(200)
    expect(fromDrawer.status).toBe(200)

    const a = await readOrder(fromCheckout.body.orderId!)
    const b = await readOrder(fromDrawer.body.orderId!)

    expect(b).toEqual(a)
    expect(b.discount_source).toBe('code')
    expect(b.promo_code_snapshot).toBe(CODE)
    expect(Number(b.discount_percent)).toBe(25)
    // The code beat the sale, so the recorded subtotal is the catalogue price
    // and the total is 25% under it.
    expect(b.total_cents).toBeLessThan(b.subtotal_cents)
    expect(b.total_cents).toBe(Math.round(b.subtotal_cents! * 0.75))
  })

  it('writes a redemption row, as a checkout order does', async () => {
    const { body } = await place(uniqueEmail('drawer-promo-redeem'), CODE)

    const { data: redemptions } = await db()
      .from('promo_redemptions')
      .select('id')
      .eq('order_id', body.orderId!)

    expect(redemptions).toHaveLength(1)
  })

  it('places an ordinary order when no code was entered', async () => {
    const { status, body } = await place(uniqueEmail('drawer-promo-none'))

    expect(status).toBe(200)
    const order = await readOrder(body.orderId!)
    expect(order.promo_code_snapshot).toBeNull()

    const { data: redemptions } = await db()
      .from('promo_redemptions')
      .select('id')
      .eq('order_id', body.orderId!)
    expect(redemptions).toHaveLength(0)
  })
})

describe('one redemption per address, whichever field the code was typed into', () => {
  // Both entry points post the same body to the same route, so there is no
  // "drawer order" the database could tell apart from a "checkout order" and
  // treat differently. That is the point, and it is why this is one test
  // rather than one per direction: the uniqueness index sees an address and a
  // code, and neither field is the privileged one.
  it('refuses a second use of a code by the same address', async () => {
    const email = uniqueEmail('drawer-promo-reuse')

    const first = await place(email, CODE)
    expect(first.status).toBe(200)

    const second = await place(email, CODE)
    expect(second.status).toBe(400)
    expect(second.body.data?.promoStatus).toBe('promo_code_used')
  })

  it('leaves no order behind when the second attempt is refused', async () => {
    const email = uniqueEmail('drawer-promo-refused')

    await place(email, CODE)
    await place(email, CODE)

    const { data: orders } = await db().from('orders').select('id').eq('customer_email', email)
    expect(orders).toHaveLength(1)
  })
})
