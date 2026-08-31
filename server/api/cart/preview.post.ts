import { cartItemsSchema, mergeItems } from '~~/server/utils/schemas'

/**
 * Resolves cart line IDs to current catalog prices. The browser stores only
 * IDs and quantities, so every displayed price comes from the database.
 */
export default defineEventHandler(async event => {
  const parsed = cartItemsSchema.safeParse((await readBody(event))?.items)
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'Invalid cart' })

  const merged = mergeItems(parsed.data)
  const { data, error } = await useSupabase()
    .from('products')
    .select('id, slug, name, price_cents, image_url, in_stock')
    .in('id', merged.map(i => i.product_id))

  // Never forward the database's own message: this endpoint is public and
  // unauthenticated, and the detail belongs in the server log.
  if (error) {
    console.error('[cart] could not price the cart:', error)
    throw createError({
      statusCode: 502,
      statusMessage: 'Could not price your cart right now. Please try again.'
    })
  }

  const lines = merged
    .map(item => {
      const product = data?.find(p => p.id === item.product_id)
      return product ? { ...product, quantity: item.quantity } : null
    })
    .filter((line): line is NonNullable<typeof line> => line !== null)

  return {
    lines,
    subtotalCents: lines
      .filter(l => l.in_stock)
      .reduce((sum, l) => sum + l.price_cents * l.quantity, 0),
    // IDs the browser still holds that no longer exist in the catalog.
    missing: merged.filter(i => !data?.some(p => p.id === i.product_id)).map(i => i.product_id)
  }
})
