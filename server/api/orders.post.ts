import { orderSchema, mergeItems } from '~~/server/utils/schemas'
import { sendOrderEmail } from '~~/server/utils/email'

/**
 * `create_order` raises a bare `unavailable_item`, so the route works out which
 * products it meant and hands them back with the 409. Best effort by design:
 * the order was already refused, and a failure to name the culprits must not
 * turn that refusal into a server error.
 */
async function findUnavailableIds(supabase: ReturnType<typeof useSupabase>, ids: string[]) {
  const { data, error } = await supabase.from('products').select('id, in_stock').in('id', ids)

  if (error) {
    console.error('[orders] could not identify unavailable products:', error)
    return []
  }

  return ids.filter(id => !data?.some(product => product.id === id && product.in_stock))
}

export default defineEventHandler(async event => {
  rateLimit(getRequestIP(event, { xForwardedFor: true }) ?? 'unknown', 5, 10 * 60_000)

  const parsed = orderSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Please check the form and try again.' })
  }

  const { customer, items } = parsed.data
  const merged = mergeItems(items)
  const supabase = useSupabase()

  // Prices, totals and stock checks all happen inside create_order, in one
  // transaction, using the catalog as the source of truth.
  const { data: orderId, error } = await supabase.rpc('create_order', {
    p_customer: customer,
    p_items: merged
  })

  if (error) {
    if (error.message.includes('unavailable_item')) {
      throw createError({
        statusCode: 409,
        statusMessage: 'One or more items are no longer available. Please review your cart.',
        data: {
          unavailableProductIds: await findUnavailableIds(
            supabase,
            merged.map(item => item.product_id)
          )
        }
      })
    }
    // create_order re-checks what Zod already checked, so these only fire for
    // callers that bypass this route.
    if (error.message.includes('empty_order') || error.message.includes('invalid_item')) {
      throw createError({ statusCode: 400, statusMessage: 'Your cart is empty or invalid.' })
    }
    console.error('[orders] create_order failed:', error)
    throw createError({ statusCode: 502, statusMessage: 'Could not submit the order. Please try again.' })
  }

  // Read back what Postgres actually stored, so the email quotes the priced
  // lines rather than anything the client sent.
  const [
    { data: order, error: orderError },
    { data: orderItems, error: itemsError }
  ] = await Promise.all([
    supabase.from('orders').select('total_cents').eq('id', orderId).single(),
    supabase.from('order_items').select('name_snapshot, unit_price_cents, quantity').eq('order_id', orderId)
  ])

  // A failed re-read must not be silent: without this the staff email would
  // quietly report a $0.00 order with no line items.
  const incomplete = Boolean(orderError || itemsError)
  if (incomplete) {
    console.error(`[orders] could not re-read ${orderId}:`, orderError ?? itemsError)
  }

  // The order row is committed and is the real record, so nothing about the
  // notification is allowed to fail the request. `send` returns errors for a
  // rejected send, but still throws on network failures or a bad API key.
  try {
    await sendOrderEmail({
      orderId,
      customer,
      items: orderItems ?? [],
      totalCents: order?.total_cents ?? 0,
      incomplete
    })
  } catch (err) {
    console.error(`[orders] email threw for ${orderId}:`, err)
  }

  return { orderId, totalCents: order?.total_cents ?? 0 }
})
