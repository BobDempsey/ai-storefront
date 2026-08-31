import { orderSchema, mergeItems } from '~~/server/utils/schemas'
import { sendOrderEmail } from '~~/server/utils/email'

export default defineEventHandler(async event => {
  rateLimit(getRequestIP(event, { xForwardedFor: true }) ?? 'unknown', 5, 10 * 60_000)

  const parsed = orderSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Please check the form and try again.' })
  }

  const { customer, items } = parsed.data
  const supabase = useSupabase()

  // Prices, totals and stock checks all happen inside create_order, in one
  // transaction, using the catalog as the source of truth.
  const { data: orderId, error } = await supabase.rpc('create_order', {
    p_customer: customer,
    p_items: mergeItems(items)
  })

  if (error) {
    if (error.message.includes('unavailable_item')) {
      throw createError({
        statusCode: 409,
        statusMessage: 'One or more items are no longer available. Please review your cart.'
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

  const [{ data: order }, { data: orderItems }] = await Promise.all([
    supabase.from('orders').select('total_cents').eq('id', orderId).single(),
    supabase.from('order_items').select('name_snapshot, unit_price_cents, quantity').eq('order_id', orderId)
  ])

  await sendOrderEmail({
    orderId,
    customer,
    items: orderItems ?? [],
    totalCents: order?.total_cents ?? 0
  })

  return { orderId, totalCents: order?.total_cents ?? 0 }
})
