import { orderSchema, mergeItems } from '~~/server/utils/schemas'
import { sendOrderEmail } from '~~/server/utils/email'
import { spendConfirmation } from '~~/server/utils/confirmations'
import { subscribeQuietly } from '~~/server/utils/subscribe'

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
  // A test order is declared by a header carrying the server's own token, not
  // by the build environment, so the branches below are the ones production
  // runs. `testOrderToken` is empty unless someone set it, and an empty token
  // matches nothing, so an unconfigured server cannot produce a test order.
  // A wrong or missing token is not an error: the request simply becomes an
  // ordinary order, so a real customer can never be refused by this.
  const { testOrderToken } = useRuntimeConfig()
  const isTest =
    Boolean(testOrderToken) && getHeader(event, 'x-test-order-token') === testOrderToken

  // A caller holding the token does not spend the customer allowance. The suite
  // shares one IP with everything else on the machine, and five orders per ten
  // minutes is gone after a single run of the database and browser tests. The
  // limiter still guards every request that does not hold the token, which in
  // production is all of them.
  if (!isTest) {
    rateLimitByCaller(
      event,
      address => address,
      5,
      10 * 60_000,
      'Too many orders. Please try again later.'
    )
  }

  const parsed = orderSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Please check the form and try again.' })
  }

  const { customer, items, confirmation, promoCode, subscribe } = parsed.data

  // A submission carrying a confirmation says it came from an assistant draft,
  // so the confirmation has to be one this server issued and has not spent.
  // Nothing else changes: the checkout page sends none and is unaffected.
  if (confirmation !== undefined && !spendConfirmation(confirmation)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'That confirmation is no longer valid. Please draft the order again.'
    })
  }

  const merged = mergeItems(items)
  const supabase = useSupabase()

  // Prices, totals and stock checks all happen inside create_order, in one
  // transaction, using the catalog as the source of truth.
  // The raw code the buyer typed goes straight to create_order, which resolves
  // it, decides between it and the store-wide sale, prices the lines and writes
  // the redemption, all in the order's own transaction.
  const { data: orderId, error } = await supabase.rpc('create_order', {
    p_customer: customer,
    p_items: merged,
    p_promo_code: promoCode || null,
    p_is_test: isTest
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
    // Each promo failure has its own remedy, so the page needs to tell them
    // apart: a typo is worth retrying, an address that already used the code
    // is not.
    const promoFailure = (
      [
        ['unknown_promo_code', "That promo code isn't recognised."],
        ['inactive_promo_code', 'That promo code is no longer valid.'],
        ['promo_code_used', 'That promo code has already been used.']
      ] as const
    ).find(([code]) => error.message.includes(code))

    if (promoFailure) {
      throw createError({
        statusCode: 400,
        statusMessage: promoFailure[1],
        data: { promoStatus: promoFailure[0] }
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

  // Secondary to the order, so it can never fail one: the row is already
  // committed and the buyer is owed their confirmation either way.
  if (subscribe) await subscribeQuietly(customer.email)

  // Read back what Postgres actually stored, so the email quotes the priced
  // lines rather than anything the client sent.
  const [
    { data: order, error: orderError },
    { data: orderItems, error: itemsError }
  ] = await Promise.all([
    supabase
      .from('orders')
      .select('total_cents, discount_source, discount_percent, promo_code_snapshot, subtotal_cents')
      .eq('id', orderId)
      .single(),
    supabase
      .from('order_items')
      .select('name_snapshot, file_name_snapshot, unit_price_cents, quantity')
      .eq('order_id', orderId)
  ])

  // A failed re-read must not be silent: without this the staff email would
  // quietly report a $0.00 order with no line items.
  const incomplete = Boolean(orderError || itemsError)
  if (incomplete) {
    console.error(`[orders] could not re-read ${orderId}:`, orderError ?? itemsError)
  }

  // Only when the re-read succeeded and the order actually recorded a
  // discount: a legacy order and a catalogue-price order both carry a null
  // discount_source, and the email must not invent one for either.
  const discount =
    order && !incomplete && order.discount_source
      ? {
          source: order.discount_source as 'sale' | 'code',
          percent: Number(order.discount_percent),
          code: order.promo_code_snapshot,
          subtotalCents: order.subtotal_cents ?? order.total_cents
        }
      : undefined

  // The order row is committed and is the real record, so nothing about the
  // notification is allowed to fail the request. `send` returns errors for a
  // rejected send, but still throws on network failures or a bad API key.
  //
  // A test order is the one case where not sending is correct rather than a
  // failure: the suite runs against the live project, and staff must not get an
  // inbox full of orders nobody placed. The order itself is committed and
  // recorded exactly like any other.
  if (!isTest) {
    try {
      await sendOrderEmail({
        orderId,
        customer,
        items: orderItems ?? [],
        totalCents: order?.total_cents ?? 0,
        incomplete,
        discount
      })
    } catch (err) {
      console.error(`[orders] email threw for ${orderId}:`, err)
    }
  }

  // The order is committed either way, so the id is always returned. The total
  // is omitted rather than defaulted when the re-read failed: a zero here reads
  // as a real amount to anything that displays it.
  return incomplete ? { orderId } : { orderId, totalCents: order?.total_cents }
})
