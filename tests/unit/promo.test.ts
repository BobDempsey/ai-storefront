import { afterEach, describe, expect, it, vi } from 'vitest'
import { useSupabaseReturning } from './setup'
import { checkPromoCode, getActivePromo } from '~~/server/utils/promo'

const activeCode = { data: { id: 'promo-1', percent: 25, active: true }, error: null }
const noRows = { data: null, error: null }
const noRedemption = { data: null, error: null }

afterEach(() => {
  vi.restoreAllMocks()
})

describe('checkPromoCode', () => {
  it('reports unknown for an empty or blank code without reading the database', async () => {
    const calls = useSupabaseReturning({})
    expect(await checkPromoCode('', 'buyer@example.com')).toEqual({ status: 'unknown', percent: 0 })
    expect(await checkPromoCode('   ', 'buyer@example.com')).toEqual({ status: 'unknown', percent: 0 })
    expect(calls).toHaveLength(0)
  })

  it('applies an active code and returns its percentage as a number', async () => {
    useSupabaseReturning({ promo_codes: activeCode, promo_redemptions: noRedemption })
    expect(await checkPromoCode('WELCOME25', 'buyer@example.com')).toEqual({
      status: 'applied',
      percent: 25
    })
  })

  // The database's unique index normalises on upper(btrim(code)), so anything
  // that does not normalise the same way here would show a buyer a discount the
  // checkout then refuses, or the reverse.
  it('normalises the code the way the database does', async () => {
    const calls = useSupabaseReturning({
      promo_codes: activeCode,
      promo_redemptions: noRedemption
    })
    await checkPromoCode('  welcome25 ', 'buyer@example.com')
    expect(calls[0]!.filters.code).toBe('WELCOME25')
  })

  it('lower-cases the email before looking for a redemption', async () => {
    const calls = useSupabaseReturning({
      promo_codes: activeCode,
      promo_redemptions: noRedemption
    })
    await checkPromoCode('WELCOME25', '  Buyer@Example.COM ')
    const redemptionCall = calls.find(call => call.table === 'promo_redemptions')
    expect(redemptionCall?.filters.email).toBe('buyer@example.com')
  })

  it('reports unknown for a code that is not in the table', async () => {
    useSupabaseReturning({ promo_codes: noRows })
    expect(await checkPromoCode('NOPE', 'buyer@example.com')).toEqual({
      status: 'unknown',
      percent: 0
    })
  })

  it('reports inactive for a deactivated code, with no discount', async () => {
    useSupabaseReturning({
      promo_codes: { data: { id: 'promo-1', percent: 25, active: false }, error: null }
    })
    expect(await checkPromoCode('WELCOME25', 'buyer@example.com')).toEqual({
      status: 'inactive',
      percent: 0
    })
  })

  it('reports used when this address already redeemed the code', async () => {
    useSupabaseReturning({
      promo_codes: activeCode,
      promo_redemptions: { data: { id: 'redemption-1' }, error: null }
    })
    expect(await checkPromoCode('WELCOME25', 'buyer@example.com')).toEqual({
      status: 'used',
      percent: 0
    })
  })

  it('skips the redemption check when no email is supplied', async () => {
    const calls = useSupabaseReturning({ promo_codes: activeCode })
    expect(await checkPromoCode('WELCOME25', '')).toEqual({ status: 'applied', percent: 25 })
    expect(calls.some(call => call.table === 'promo_redemptions')).toBe(false)
  })

  // The preview is advisory and create_order checks the code again, so a read
  // failure must not throw and must not hand out a discount.
  it('reports unknown rather than throwing when the code lookup fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    useSupabaseReturning({ promo_codes: { data: null, error: { message: 'boom' } } })
    expect(await checkPromoCode('WELCOME25', 'buyer@example.com')).toEqual({
      status: 'unknown',
      percent: 0
    })
  })

  it('reports unknown rather than throwing when the redemption lookup fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    useSupabaseReturning({
      promo_codes: activeCode,
      promo_redemptions: { data: null, error: { message: 'boom' } }
    })
    expect(await checkPromoCode('WELCOME25', 'buyer@example.com')).toEqual({
      status: 'unknown',
      percent: 0
    })
  })
})

describe('getActivePromo', () => {
  it('returns the active code with a numeric percentage', async () => {
    useSupabaseReturning({
      promo_codes: { data: { code: 'WELCOME25', percent: '25' }, error: null }
    })
    expect(await getActivePromo()).toEqual({ code: 'WELCOME25', percent: 25 })
  })

  it('returns null when no code is active', async () => {
    useSupabaseReturning({ promo_codes: noRows })
    expect(await getActivePromo()).toBeNull()
  })

  it('returns null rather than throwing when the read fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    useSupabaseReturning({ promo_codes: { data: null, error: { message: 'boom' } } })
    expect(await getActivePromo()).toBeNull()
  })
})
