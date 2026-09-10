import { describe, expect, it } from 'vitest'
import {
  discountedCents,
  resolveDiscountPercent,
  salePriceCents,
  withSalePricing,
  type SaleState
} from '~~/server/utils/pricing'

const off: SaleState = { saleActive: false, salePercent: 0 }
const sale20: SaleState = { saleActive: true, salePercent: 20 }
// An inactive sale still carries its percentage, which is exactly the case a
// naive `sale.salePercent` read would get wrong.
const parked: SaleState = { saleActive: false, salePercent: 40 }

describe('resolveDiscountPercent', () => {
  it('is zero when nothing applies', () => {
    expect(resolveDiscountPercent(off)).toBe(0)
  })

  it('ignores the percentage of an inactive sale', () => {
    expect(resolveDiscountPercent(parked)).toBe(0)
    expect(resolveDiscountPercent(parked, 10)).toBe(10)
  })

  it('takes the better of the sale and the code, never the sum', () => {
    expect(resolveDiscountPercent(sale20, 25)).toBe(25)
    expect(resolveDiscountPercent(sale20, 5)).toBe(20)
  })

  it('gives the same answer when the two are equal', () => {
    expect(resolveDiscountPercent(sale20, 20)).toBe(20)
  })
})

describe('discountedCents', () => {
  it('leaves the price alone at zero or a negative percent', () => {
    expect(discountedCents(1920, 0)).toBe(1920)
    expect(discountedCents(1920, -10)).toBe(1920)
  })

  it('applies a whole-cent discount exactly', () => {
    expect(discountedCents(2000, 25)).toBe(1500)
    expect(discountedCents(1920, 20)).toBe(1536)
  })

  // create_order rounds with Postgres `round()`, which is half-away-from-zero
  // on numeric. Math.round agrees for the positive values prices take, and
  // these are the cases where a half-to-even implementation would diverge.
  it('rounds a half cent up, the way create_order does', () => {
    expect(discountedCents(999, 50)).toBe(500) // 499.5 -> 500, not 499
    expect(discountedCents(2999, 50)).toBe(1500) // 1499.5 -> 1500, not 1499
    expect(discountedCents(1001, 50)).toBe(501) // 500.5 -> 501, not 500
  })

  it('rounds down below the half cent', () => {
    expect(discountedCents(997, 50)).toBe(499) // 498.5 -> 499
    expect(discountedCents(333, 10)).toBe(300) // 299.7 -> 300
    expect(discountedCents(101, 33)).toBe(68) // 67.67 -> 68
  })

  it('takes a full discount to zero', () => {
    expect(discountedCents(1920, 100)).toBe(0)
  })

  it('leaves a free item free', () => {
    expect(discountedCents(0, 25)).toBe(0)
  })
})

describe('salePriceCents', () => {
  it('is the undiscounted price with no sale on', () => {
    expect(salePriceCents(1920, off)).toBe(1920)
    expect(salePriceCents(1920, parked)).toBe(1920)
  })

  it('applies an active sale', () => {
    expect(salePriceCents(1920, sale20)).toBe(1536)
  })
})

describe('withSalePricing', () => {
  const product = { id: 'p1', name: 'Articulated Dragon', price_cents: 1920 }

  it('leaves the price alone and reports no original when nothing applies', () => {
    const priced = withSalePricing(product, off)
    expect(priced.price_cents).toBe(1920)
    expect(priced.originalPriceCents).toBeUndefined()
    expect(priced.salePercent).toBe(0)
  })

  it('keeps the original price beside the discounted one', () => {
    const priced = withSalePricing(product, sale20)
    expect(priced.price_cents).toBe(1536)
    expect(priced.originalPriceCents).toBe(1920)
    expect(priced.salePercent).toBe(20)
  })

  it('prices at the promo code when it beats the sale', () => {
    const priced = withSalePricing(product, sale20, 50)
    expect(priced.price_cents).toBe(960)
    expect(priced.originalPriceCents).toBe(1920)
    expect(priced.salePercent).toBe(50)
  })

  it('carries every other field through untouched', () => {
    const priced = withSalePricing(product, sale20)
    expect(priced.id).toBe('p1')
    expect(priced.name).toBe('Articulated Dragon')
  })

  it('does not mutate the item it was given', () => {
    withSalePricing(product, sale20)
    expect(product.price_cents).toBe(1920)
  })
})
