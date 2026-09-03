import type { SaleState } from '~~/server/utils/pricing'

/**
 * Reads the singleton `store_settings` row. Staff edit it through the
 * Supabase dashboard; there is no write path in the app.
 */
export async function getSaleState(): Promise<SaleState> {
  const { data, error } = await useSupabase()
    .from('store_settings')
    .select('sale_active, sale_percent')
    .eq('id', true)
    .maybeSingle()

  if (error) {
    console.error('[store-settings] could not read sale state:', error)
    return { saleActive: false, salePercent: 0 }
  }

  return {
    saleActive: data?.sale_active ?? false,
    salePercent: data?.sale_percent ?? 0
  }
}
