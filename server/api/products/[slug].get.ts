import { withProductFiles } from '~~/server/utils/rows'

export default defineEventHandler(async (event): Promise<Product> => {
  const slug = getRouterParam(event, 'slug')
  // The route only matches with a segment present, so this is the type saying
  // what the router already guarantees rather than a case anyone has hit.
  if (!slug) throw createError({ statusCode: 404, statusMessage: 'Product not found' })

  const [{ data, error }, sale] = await Promise.all([
    useSupabase()
      .from('products')
      .select('id, slug, name, description, price_cents, image_url, in_stock, kind, file_name, file_format, file_size_bytes')
      .eq('slug', slug)
      .maybeSingle(),
    getSaleState()
  ])

  if (error) {
    console.error('[products] could not load the product:', error)
    throw createError({
      statusCode: 502,
      statusMessage: 'Could not load this product right now. Please try again.'
    })
  }
  if (!data) throw createError({ statusCode: 404, statusMessage: 'Product not found' })
  return withSalePricing(withProductFiles(data), sale)
})
