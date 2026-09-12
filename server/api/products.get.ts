import { catalogueQuerySchema } from '~~/server/utils/schemas'
import { normalizeSearchTerm, searchFilter } from '~~/server/utils/search'

/**
 * How many items the same filters match, with no rows fetched. Used only on the
 * past-the-end path, where the ranged query errors before it can report one.
 */
async function countMatching({ kind, term }: { kind?: string; term: string | null }) {
  let query = useSupabase().from('products').select('id', { count: 'exact', head: true })
  if (kind) query = query.eq('kind', kind)
  if (term) query = query.or(searchFilter(term))

  const { count, error } = await query
  if (error) {
    console.error('[products] could not count the catalogue:', error)
    return 0
  }
  return count ?? 0
}

export default defineEventHandler(async event => {
  const parsed = catalogueQuerySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'That catalogue request could not be read.'
    })
  }

  const { kind, page, perPage } = parsed.data
  // An empty or whitespace-only term is no search at all, which is what keeps
  // the whole catalogue on screen rather than nothing.
  const term = normalizeSearchTerm(parsed.data.q)

  // `exact` returns the matched total alongside the page in one round trip,
  // which is what the paging controls and the per-tab counts both need. A page
  // past the end comes back empty with the true total rather than as an error,
  // so a stale link is a dead end the visitor can see.
  let catalogue = useSupabase()
    .from('products')
    .select(
      'id, slug, name, description, price_cents, image_url, in_stock, kind, file_name, file_format, file_size_bytes',
      { count: 'exact' }
    )

  if (kind) catalogue = catalogue.eq('kind', kind)

  // Filtered in the database rather than after the fetch, and before the range:
  // that ordering is what makes a page of a search a page of matches rather
  // than the matches within one page.
  if (term) catalogue = catalogue.or(searchFilter(term))

  const from = (page - 1) * perPage
  const [{ data, error, count }, sale] = await Promise.all([
    catalogue.order('created_at', { ascending: true }).range(from, from + perPage - 1),
    getSaleState()
  ])

  // PostgREST refuses a range that starts past the end with its own 416 rather
  // than returning nothing, so a stale link to page nine would reach the
  // visitor as a broken shop. It is an empty page, not a failure: the count
  // comes back on that error, and the storefront shows the true total.
  if (error?.code === 'PGRST103') {
    return { items: [], total: await countMatching({ kind, term }), page, perPage }
  }

  if (error) {
    console.error('[products] could not load the catalogue:', error)
    throw createError({
      statusCode: 502,
      statusMessage: 'Could not load products right now. Please try again.'
    })
  }

  return {
    items: data.map(product => withSalePricing(product, sale)),
    total: count ?? data.length,
    page,
    perPage
  }
})
