export default defineEventHandler(async () => {
  const { data, error } = await useSupabase()
    .from('products')
    .select('id, slug, name, description, price_cents, image_url, in_stock')
    .order('created_at', { ascending: true })

  if (error) throw createError({ statusCode: 502, statusMessage: error.message })
  return data
})
