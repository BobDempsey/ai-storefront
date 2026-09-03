import { cartPreviewSchema, mergeItems } from '~~/server/utils/schemas'
import { checkPromoCode, type PromoStatus } from '~~/server/utils/promo'

/**
 * Resolves cart line IDs to current catalog prices. The browser stores only
 * IDs and quantities, so every displayed price comes from the database.
 *
 * A promo code may ride along from the checkout page, in which case the lines
 * come back priced at the better of the sale and the code. That answer is
 * advisory: `create_order` resolves the code again when the order is placed,
 * and its answer is the one that counts.
 */
export default defineEventHandler(async event => {
  const parsed = cartPreviewSchema.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'Invalid cart' })

  const merged = mergeItems(parsed.data.items)
  const [{ data, error }, sale] = await Promise.all([
    useSupabase()
      .from('products')
      .select('id, slug, name, price_cents, image_url, in_stock, kind, file_name, file_format, file_size_bytes')
      .in('id', merged.map(i => i.product_id)),
    getSaleState()
  ])

  // Never forward the database's own message: this endpoint is public and
  // unauthenticated, and the detail belongs in the server log.
  if (error) {
    console.error('[cart] could not price the cart:', error)
    throw createError({
      statusCode: 502,
      statusMessage: 'Could not price your cart right now. Please try again.'
    })
  }

  // Only looked up when the buyer typed something, so the cart page and the
  // assistant, which send no code, do exactly what they did before.
  const promo = parsed.data.promoCode
    ? await checkPromoCode(parsed.data.promoCode, parsed.data.email ?? '')
    : null

  const lines = merged
    .map(item => {
      const product = data?.find(p => p.id === item.product_id)
      return product
        ? { ...withSalePricing(product, sale, promo?.percent ?? 0), quantity: item.quantity }
        : null
    })
    .filter((line): line is NonNullable<typeof line> => line !== null)

  return {
    lines,
    subtotalCents: lines
      .filter(l => l.in_stock)
      .reduce((sum, l) => sum + l.price_cents * l.quantity, 0),
    // IDs the browser still holds that no longer exist in the catalog.
    missing: merged.filter(i => !data?.some(p => p.id === i.product_id)).map(i => i.product_id),
    // Absent unless a code was sent, so nothing that ignores it sees a change.
    promoStatus: (promo?.status ?? undefined) as PromoStatus | undefined
  }
})
