import { catalogueQuerySchema } from '~~/server/utils/schemas'
import { normalizeSearchTerm, searchFilter } from '~~/server/utils/search'

export default defineEventHandler(async event => {
  const parsed = catalogueQuerySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'That search term could not be read.'
    })
  }

  // An empty or whitespace-only term is no search at all, which is what keeps
  // the whole catalogue on screen rather than nothing.
  const term = normalizeSearchTerm(parsed.data.q)

  let catalogue = useSupabase()
    .from('products')
    .select('id, slug, name, description, price_cents, image_url, in_stock, kind, file_name, file_format, file_size_bytes')

  // Filtered in the database rather than after the fetch. It reads the same
  // either way while the whole catalogue arrives in one call, and it is what
  // stays correct when pagination lands: the term is applied before the range,
  // so a page of results is a page of matches rather than the matches within
  // one page.
  if (term) catalogue = catalogue.or(searchFilter(term))

  const [{ data, error }, sale] = await Promise.all([
    catalogue.order('created_at', { ascending: true }),
    getSaleState()
  ])

  if (error) {
    console.error('[products] could not load the catalogue:', error)
    throw createError({
      statusCode: 502,
      statusMessage: 'Could not load products right now. Please try again.'
    })
  }
  return data.map(product => withSalePricing(product, sale))
})
