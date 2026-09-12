/**
 * Reading side of promo codes. `create_order` resolves the code again when the
 * order is placed and its answer is the one that counts; this exists so the
 * checkout can show the buyer a discounted total before committing, and so the
 * welcome email can quote a code the checkout will actually accept.
 */

// PromoStatus lives in shared/types/api.ts, because the checkout page reads it
// off the preview response. It is imported rather than re-exported: a re-export
// still registers this file as a second source for the name, which is what the
// build was warning about.
import type { PromoStatus } from '~~/shared/types/api'

export interface PromoResult {
  status: PromoStatus
  /** The discount to apply. Zero for every status but `applied`. */
  percent: number
}

const NO_PROMO: PromoResult = { status: 'unknown', percent: 0 }

/** Normalised the same way the database's unique index normalises them. */
function normaliseCode(code: string) {
  return code.trim().toUpperCase()
}

function normaliseEmail(email: string) {
  return email.trim().toLowerCase()
}

/**
 * Resolves a code for a given buyer. A database failure reports `unknown`
 * rather than throwing: the preview is advisory, and an order placed with a
 * code this could not resolve is still checked by `create_order`.
 */
export async function checkPromoCode(code: string, email: string): Promise<PromoResult> {
  const normalised = normaliseCode(code)
  if (!normalised) return NO_PROMO

  const supabase = useSupabase()
  const { data, error } = await supabase
    .from('promo_codes')
    .select('id, percent, active')
    .eq('code', normalised)
    .maybeSingle()

  if (error) {
    console.error('[promo] could not read the code:', error)
    return NO_PROMO
  }

  if (!data) return { status: 'unknown', percent: 0 }
  if (!data.active) return { status: 'inactive', percent: 0 }

  const buyer = normaliseEmail(email)
  if (buyer) {
    const { data: redemption, error: redemptionError } = await supabase
      .from('promo_redemptions')
      .select('id')
      .eq('promo_code_id', data.id)
      .eq('email', buyer)
      .maybeSingle()

    if (redemptionError) {
      console.error('[promo] could not read redemptions:', redemptionError)
      return NO_PROMO
    }

    if (redemption) return { status: 'used', percent: 0 }
  }

  return { status: 'applied', percent: Number(data.percent) }
}

/**
 * The active code, for the welcome email and for the percentage the opt-in copy
 * quotes. Returns null when no code is active, which the callers treat as "say
 * nothing about a discount" rather than as an error.
 */
export async function getActivePromo(): Promise<{ code: string; percent: number } | null> {
  const { data, error } = await useSupabase()
    .from('promo_codes')
    .select('code, percent')
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[promo] could not read the active code:', error)
    return null
  }

  return data ? { code: data.code, percent: Number(data.percent) } : null
}
