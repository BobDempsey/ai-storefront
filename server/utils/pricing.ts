export interface SaleState {
  saleActive: boolean
  salePercent: number
}

/**
 * Round-half-up on integer cents, matching `create_order`'s
 * `round(price_cents * (100 - sale_percent) / 100)` in supabase/schema.sql.
 * The two must agree, or a buyer could be shown one price and charged another.
 */
export function salePriceCents(priceCents: number, sale: SaleState): number {
  if (!sale.saleActive) return priceCents
  return Math.round((priceCents * (100 - sale.salePercent)) / 100)
}

/** Adds the sale-aware fields every price-bearing API response carries. */
export function withSalePricing<T extends { price_cents: number }>(item: T, sale: SaleState) {
  const discounted = salePriceCents(item.price_cents, sale)
  return {
    ...item,
    price_cents: discounted,
    originalPriceCents: sale.saleActive ? item.price_cents : undefined,
    salePercent: sale.saleActive ? sale.salePercent : 0
  }
}
