export default defineEventHandler(async event => {
  const slug = getRouterParam(event, 'slug')

  const { data, error } = await useSupabase()
    .from('products')
    .select('id, slug, name, description, price_cents, image_url, in_stock')
    .eq('slug', slug)
    .maybeSingle()

  if (error) throw createError({ statusCode: 502, statusMessage: error.message })
  if (!data) throw createError({ statusCode: 404, statusMessage: 'Product not found' })
  return data
})
