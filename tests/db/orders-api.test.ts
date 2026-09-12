import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { BASE_URL, TEST_ORDER_TOKEN, db, deleteOrders, uniqueEmail } from './client'

/**
 * Drives the real route against a running dev server, so the Zod layer, the
 * error mapping and the notification skip are all in the path.
 *
 * Every request carries the test-order token, which both marks the order and
 * exempts it from the five-per-ten-minutes limit, so this file and the browser
 * tests can run back to back without spending a real customer's allowance.
 */

let productId: string
const created: string[] = []

const post = (body: unknown, headers: Record<string, string> = {}) =>
  fetch(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body)
  })

/** Every order this file places is a test order, so none of them emails staff. */
const asTest = { 'x-test-order-token': TEST_ORDER_TOKEN }

beforeAll(async () => {
  if (!TEST_ORDER_TOKEN) {
    throw new Error('NUXT_TEST_ORDER_TOKEN is not set in .env; these would email staff')
  }

  const health = await fetch(`${BASE_URL}/api/products`).catch(() => null)
  if (!health?.ok) {
    throw new Error(`no dev server answering at ${BASE_URL}; run "npm run dev" first`)
  }

  const { items } = (await health.json()) as { items: { id: string; kind: string }[] }
  productId = items.find(p => p.kind === 'physical')!.id
})

afterEach(async () => {
  await deleteOrders(created.splice(0))
})

afterAll(async () => {
  await deleteOrders(created.splice(0))
})

describe('POST /api/orders', () => {
  it('places an order and reports its id and total', async () => {
    const response = await post(
      {
        customer: { name: 'API Test', email: uniqueEmail('api-happy') },
        items: [{ productId, quantity: 2 }]
      },
      asTest
    )

    expect(response.status).toBe(200)
    const body = (await response.json()) as { orderId: string; totalCents: number }
    created.push(body.orderId)

    expect(body.orderId).toMatch(/^[0-9a-f-]{36}$/)
    expect(body.totalCents).toBeGreaterThan(0)

    const { data: order } = await db()
      .from('orders')
      .select('is_test, total_cents')
      .eq('id', body.orderId)
      .single()

    // The response and the row agree, and the order carries the marker, so it
    // never reached the notification.
    expect(order!.is_test).toBe(true)
    expect(order!.total_cents).toBe(body.totalCents)
  })

  // Every address this file uses is unroutable, so an order that tried to
  // confirm itself to the buyer would be rejected by Resend. A test order
  // sends nothing to anyone, and withholding both emails is a success rather
  // than the partial failure a real order reports when its email does not send.
  it('places a test order without emailing staff or the buyer, and reports no failure', async () => {
    const email = uniqueEmail('api-test-order')
    const response = await post(
      {
        customer: { name: 'API Test', email },
        items: [{ productId, quantity: 1 }]
      },
      asTest
    )

    expect(response.status).toBe(200)
    const body = (await response.json()) as Record<string, unknown>
    created.push(body.orderId as string)

    // The whole response is the order and its total: no error, no partial
    // delivery, nothing about email at all.
    expect(Object.keys(body).sort()).toEqual(['orderId', 'totalCents'])

    const { data: order } = await db()
      .from('orders')
      .select('is_test, customer_email')
      .eq('id', body.orderId as string)
      .single()

    expect(order!.is_test).toBe(true)
    expect(order!.customer_email).toBe(email)
  })

  it('rejects an unrecognised promo code with its own status, and writes no order', async () => {
    const email = uniqueEmail('api-badpromo')
    const response = await post(
      {
        customer: { name: 'API Test', email },
        items: [{ productId, quantity: 1 }],
        promoCode: 'NOT-A-REAL-CODE'
      },
      asTest
    )

    expect(response.status).toBe(400)
    const body = (await response.json()) as { data?: { promoStatus?: string } }
    expect(body.data?.promoStatus).toBe('unknown_promo_code')

    const { data: orders } = await db().from('orders').select('id').eq('customer_email', email)
    expect(orders).toEqual([])
  })

  it('reports an unavailable product with a 409 and names it', async () => {
    // A well-formed id that is not in the catalogue takes the same path as one
    // that has gone out of stock, without having to edit the live catalogue.
    const missing = '11111111-2222-4333-8444-555555555555'
    const email = uniqueEmail('api-unavailable')

    const response = await post(
      {
        customer: { name: 'API Test', email },
        items: [
          { productId, quantity: 1 },
          { productId: missing, quantity: 1 }
        ]
      },
      asTest
    )

    expect(response.status).toBe(409)
    const body = (await response.json()) as {
      statusMessage?: string
      message?: string
      data?: { unavailableProductIds?: string[] }
    }
    expect(body.data?.unavailableProductIds).toContain(missing)

    // The whole order is refused, not just the missing line.
    const { data: orders } = await db().from('orders').select('id').eq('customer_email', email)
    expect(orders).toEqual([])

    // Nothing from Postgres or the driver reaches the customer.
    const text = `${body.statusMessage ?? ''} ${body.message ?? ''}`
    expect(text).not.toMatch(/postgres|supabase|unavailable_item|pgrst/i)
  })
})
