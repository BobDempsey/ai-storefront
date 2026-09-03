export interface SaleState {
  saleActive: boolean
  salePercent: number
}

/**
 * The better of the store-wide sale and a promo code, never both. Mirrors the
 * `greatest(...)` in `create_order`, which is the figure actually charged: a
 * buyer gets whichever offer is larger, so a total can never fall below what
 * the deepest single discount produces.
 */
export function resolveDiscountPercent(sale: SaleState, promoPercent = 0): number {
  return Math.max(sale.saleActive ? sale.salePercent : 0, promoPercent)
}

/**
 * Round-half-up on integer cents, matching `create_order`'s
 * `round(price_cents * (100 - percent) / 100)` in supabase/schema.sql.
 * The two must agree, or a buyer could be shown one price and charged another.
 */
export function discountedCents(priceCents: number, percent: number): number {
  if (percent <= 0) return priceCents
  return Math.round((priceCents * (100 - percent)) / 100)
}

/** The sale price alone, for callers that never see a promo code. */
export function salePriceCents(priceCents: number, sale: SaleState): number {
  return discountedCents(priceCents, resolveDiscountPercent(sale))
}

/**
 * Adds the sale-aware fields every price-bearing API response carries.
 * `promoPercent` is only ever non-zero on the checkout preview, where the
 * buyer has supplied a code that resolved; everywhere else this prices exactly
 * as it did before promo codes existed.
 */
export function withSalePricing<T extends { price_cents: number }>(
  item: T,
  sale: SaleState,
  promoPercent = 0
) {
  const percent = resolveDiscountPercent(sale, promoPercent)
  return {
    ...item,
    price_cents: discountedCents(item.price_cents, percent),
    originalPriceCents: percent > 0 ? item.price_cents : undefined,
    salePercent: percent
  }
}
