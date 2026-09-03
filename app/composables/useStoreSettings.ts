import type { StoreSettings } from '~/types'

/**
 * Sale state and the active promo discount, fetched once and shared by key.
 *
 * The opt-in copy quotes `promoPercent` rather than a number written into the
 * page, so the offer can never promise a discount the checkout would not give.
 * The endpoint sends the percentage only; the code itself stays on the server.
 */
export function useStoreSettings() {
  const { data } = useFetch<StoreSettings>('/api/store-settings', { key: 'store-settings' })

  const promoPercent = computed(() => data.value?.promoPercent ?? 0)

  /** "25% off your first order", or empty when no code is active. */
  const optinOffer = computed(() =>
    promoPercent.value > 0 ? `${promoPercent.value}% off your first order` : ''
  )

  return { settings: data, promoPercent, optinOffer }
}
