export default defineEventHandler(async () => {
  const { data, error } = await useSupabase()
    .from('products')
    .select('id, slug, name, description, price_cents, image_url, in_stock, kind, file_name, file_format, file_size_bytes')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[products] could not load the catalogue:', error)
    throw createError({
      statusCode: 502,
      statusMessage: 'Could not load products right now. Please try again.'
    })
  }
  return data
})
