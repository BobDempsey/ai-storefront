export default defineEventHandler(async event => {
  const slug = getRouterParam(event, 'slug')

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
  return withSalePricing(data, sale)
})
