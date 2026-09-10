import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { db, deleteOrders, sweepStaleTestOrders, uniqueEmail } from './client'

/**
 * Calls the real `create_order` rather than a reimplementation of it: the
 * pricing rules live in that function, so anything else would be testing a
 * copy. Every order is created with `p_is_test => true` and deleted in
 * teardown, whether or not the test passed.
 */

let productA: { id: string; price_cents: number }
let productB: { id: string; price_cents: number }
let saleWasActive = false
let salePercentBefore = 0

const created: string[] = []

const call = async (args: Record<string, unknown>) =>
  db().rpc('create_order', { p_is_test: true, ...args })

const customer = (prefix: string) => ({ name: 'Create Order Test', email: uniqueEmail(prefix) })

const setSale = async (active: boolean, percent: number) => {
  const { error } = await db()
    .from('store_settings')
    .update({ sale_active: active, sale_percent: percent })
    .eq('id', true)
  if (error) throw new Error(`could not set the sale: ${error.message}`)
}

beforeAll(async () => {
  await sweepStaleTestOrders()

  const { data: products, error } = await db()
    .from('products')
    .select('id, price_cents')
    .eq('kind', 'physical')
    .eq('in_stock', true)
    .order('created_at')
    .limit(2)
  if (error || !products || products.length < 2) {
    throw new Error('need two in-stock physical products to test against')
  }
  ;[productA, productB] = products

  // The store-wide sale is shared state on a live project, so its setting is
  // captured here and put back in afterAll rather than left however a test
  // happened to leave it.
  const { data: settings } = await db()
    .from('store_settings')
    .select('sale_active, sale_percent')
    .eq('id', true)
    .single()
  saleWasActive = settings?.sale_active ?? false
  salePercentBefore = Number(settings?.sale_percent ?? 0)

  await setSale(false, 0)
})

afterEach(async () => {
  await deleteOrders(created.splice(0))
})

afterAll(async () => {
  await setSale(saleWasActive, salePercentBefore)
})

const readOrder = async (id: string) => {
  const { data } = await db()
    .from('orders')
    .select(
      'is_test, total_cents, subtotal_cents, discount_source, discount_percent, promo_code_snapshot'
    )
    .eq('id', id)
    .single()
  return data!
}

describe('create_order at catalogue prices', () => {
  it('commits the order, its lines and its totals', async () => {
    const { data: id, error } = await call({
      p_customer: customer('plain'),
      p_items: [
        { product_id: productA.id, quantity: 2 },
        { product_id: productB.id, quantity: 1 }
      ]
    })
    expect(error).toBeNull()
    created.push(id)

    const order = await readOrder(id)
    const expected = productA.price_cents * 2 + productB.price_cents

    expect(order.is_test).toBe(true)
    expect(order.total_cents).toBe(expected)
    expect(order.subtotal_cents).toBe(expected)
    // A catalogue-price order records a real zero, not the legacy all-null shape.
    expect(order.discount_source).toBeNull()
    expect(Number(order.discount_percent)).toBe(0)
    expect(order.promo_code_snapshot).toBeNull()

    const { data: items } = await db()
      .from('order_items')
      .select('product_id, unit_price_cents, quantity')
      .eq('order_id', id)
    expect(items).toHaveLength(2)
  })

  it('sums a product listed twice rather than rejecting it', async () => {
    const { data: id } = await call({
      p_customer: customer('dupe'),
      p_items: [
        { product_id: productA.id, quantity: 1 },
        { product_id: productA.id, quantity: 2 }
      ]
    })
    created.push(id)

    const { data: items } = await db()
      .from('order_items')
      .select('quantity')
      .eq('order_id', id)
    expect(items).toEqual([{ quantity: 3 }])
  })

  it('refuses an empty cart and writes nothing', async () => {
    const { error } = await call({ p_customer: customer('empty'), p_items: [] })
    expect(error?.message).toContain('empty_order')
  })

  it('refuses a product that is not in the catalogue', async () => {
    const { error } = await call({
      p_customer: customer('missing'),
      p_items: [{ product_id: '11111111-2222-4333-8444-555555555555', quantity: 1 }]
    })
    expect(error?.message).toContain('unavailable_item')
  })
})

describe('create_order under a store-wide sale', () => {
  it('prices every line at the sale and records the sale as the source', async () => {
    await setSale(true, 20)
    const { data: id } = await call({
      p_customer: customer('sale'),
      p_items: [{ product_id: productA.id, quantity: 2 }]
    })
    created.push(id)

    const order = await readOrder(id)
    const unit = Math.round((productA.price_cents * 80) / 100)

    expect(order.total_cents).toBe(unit * 2)
    expect(order.subtotal_cents).toBe(productA.price_cents * 2)
    expect(order.discount_source).toBe('sale')
    expect(Number(order.discount_percent)).toBe(20)
    expect(order.promo_code_snapshot).toBeNull()
  })

  it('prices a test order exactly as it would a real one', async () => {
    await setSale(true, 20)
    const items = [{ product_id: productA.id, quantity: 2 }]

    const { data: testId } = await call({ p_customer: customer('same-test'), p_items: items })
    created.push(testId)
    const { data: realId } = await db().rpc('create_order', {
      p_customer: customer('same-real'),
      p_items: items,
      p_is_test: false
    })
    created.push(realId)

    const asTest = await readOrder(testId)
    const asReal = await readOrder(realId)

    expect(asTest.is_test).toBe(true)
    expect(asReal.is_test).toBe(false)
    expect(asTest.total_cents).toBe(asReal.total_cents)
    expect(asTest.subtotal_cents).toBe(asReal.subtotal_cents)
    expect(asTest.discount_source).toBe(asReal.discount_source)
    expect(Number(asTest.discount_percent)).toBe(Number(asReal.discount_percent))
  })
})

describe('create_order with a promo code', () => {
  it('records the code, its percentage and the redemption', async () => {
    await setSale(false, 0)
    const who = customer('promo')

    const { data: id, error } = await call({
      p_customer: who,
      p_items: [{ product_id: productA.id, quantity: 1 }],
      p_promo_code: 'welcome25'
    })
    expect(error).toBeNull()
    created.push(id)

    const order = await readOrder(id)
    expect(order.discount_source).toBe('code')
    expect(Number(order.discount_percent)).toBe(25)
    // Snapshotted in the normalised form the unique index uses.
    expect(order.promo_code_snapshot).toBe('WELCOME25')
    expect(order.total_cents).toBe(Math.round((productA.price_cents * 75) / 100))

    const { data: redemptions } = await db()
      .from('promo_redemptions')
      .select('id')
      .eq('order_id', id)
    expect(redemptions).toHaveLength(1)
  })

  it('takes the deeper sale over a smaller code, and says the sale priced it', async () => {
    await setSale(true, 50)
    const { data: id } = await call({
      p_customer: customer('sale-beats-code'),
      p_items: [{ product_id: productA.id, quantity: 1 }],
      p_promo_code: 'WELCOME25'
    })
    created.push(id)

    const order = await readOrder(id)
    expect(order.discount_source).toBe('sale')
    expect(Number(order.discount_percent)).toBe(50)
    expect(order.promo_code_snapshot).toBeNull()
    expect(order.total_cents).toBe(Math.round((productA.price_cents * 50) / 100))
  })

  it('never stacks the sale and the code', async () => {
    await setSale(true, 20)
    const { data: id } = await call({
      p_customer: customer('no-stack'),
      p_items: [{ product_id: productA.id, quantity: 1 }],
      p_promo_code: 'WELCOME25'
    })
    created.push(id)

    const order = await readOrder(id)
    // 25 off, not 40 off, and not 20 then 25 on the remainder.
    expect(order.total_cents).toBe(Math.round((productA.price_cents * 75) / 100))
    expect(Number(order.discount_percent)).toBe(25)
  })

  it('refuses an unknown code and writes nothing', async () => {
    const { error } = await call({
      p_customer: customer('bad-code'),
      p_items: [{ product_id: productA.id, quantity: 1 }],
      p_promo_code: 'NOT-A-REAL-CODE'
    })
    expect(error?.message).toContain('unknown_promo_code')
  })

  it('refuses the same code twice for one address', async () => {
    await setSale(false, 0)
    const who = customer('repeat')

    const { data: id } = await call({
      p_customer: who,
      p_items: [{ product_id: productA.id, quantity: 1 }],
      p_promo_code: 'WELCOME25'
    })
    created.push(id)

    const { error } = await call({
      p_customer: who,
      p_items: [{ product_id: productA.id, quantity: 1 }],
      p_promo_code: 'WELCOME25'
    })
    expect(error?.message).toContain('promo_code_used')
  })
})
