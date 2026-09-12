import { getActivePromo } from '~~/server/utils/promo'

/**
 * Public sale state, read the same way `/api/products` reads the catalogue,
 * plus the active promo code's percentage so the opt-in copy can name the
 * discount it is offering.
 *
 * The percentage only. The code itself never leaves the server: a visitor must
 * not be able to read a discount they were never sent.
 */
export default defineEventHandler(async (): Promise<StoreSettings> => {
  const [{ saleActive, salePercent }, promo] = await Promise.all([
    getSaleState(),
    getActivePromo()
  ])

  return { saleActive, salePercent, promoPercent: promo?.percent ?? 0 }
})
