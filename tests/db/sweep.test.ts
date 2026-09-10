import { afterEach, describe, expect, it } from 'vitest'
import { db, deleteOrders, sweepStaleTestOrders, uniqueEmail } from './client'

const created: string[] = []

afterEach(async () => {
  await deleteOrders(created.splice(0))
})

describe('sweepStaleTestOrders', () => {
  it('removes a stranded test order and its items', async () => {
    const { data: product } = await db()
      .from('products')
      .select('id')
      .eq('in_stock', true)
      .limit(1)
      .single()

    const { data: order, error } = await db()
      .from('orders')
      .insert({
        customer_name: 'Stranded Run',
        customer_email: uniqueEmail('stranded'),
        is_test: true,
        // Two hours old, so it is past the sweep's one-hour cutoff.
        created_at: new Date(Date.now() - 2 * 60 * 60_000).toISOString()
      })
      .select('id')
      .single()
    expect(error).toBeNull()
    created.push(order!.id)

    await db().from('order_items').insert({
      order_id: order!.id,
      product_id: product!.id,
      name_snapshot: 'Stranded line',
      unit_price_cents: 100,
      quantity: 1
    })

    await sweepStaleTestOrders()

    const { data: after } = await db().from('orders').select('id').eq('id', order!.id)
    expect(after).toEqual([])

    const { data: items } = await db().from('order_items').select('id').eq('order_id', order!.id)
    expect(items).toEqual([])
    created.length = 0
  })

  it('leaves a recent test order alone, so a parallel run is never cut out from under it', async () => {
    const { data: order } = await db()
      .from('orders')
      .insert({ customer_name: 'Fresh Run', customer_email: uniqueEmail('fresh'), is_test: true })
      .select('id')
      .single()
    created.push(order!.id)

    await sweepStaleTestOrders()

    const { data: after } = await db().from('orders').select('id').eq('id', order!.id)
    expect(after).toHaveLength(1)
  })

  it('leaves a real order alone however old it is', async () => {
    const { data: order } = await db()
      .from('orders')
      .insert({
        customer_name: 'Real Order',
        customer_email: uniqueEmail('real'),
        is_test: false,
        created_at: new Date(Date.now() - 48 * 60 * 60_000).toISOString()
      })
      .select('id')
      .single()
    created.push(order!.id)

    await sweepStaleTestOrders()

    const { data: after } = await db().from('orders').select('id').eq('id', order!.id)
    expect(after).toHaveLength(1)
  })
})
