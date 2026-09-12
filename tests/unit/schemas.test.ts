import { describe, expect, it } from 'vitest'
import {
  catalogueQuerySchema,
  contactSchema,
  emailOptinSchema,
  mergeItems,
  orderSchema
} from '~~/server/utils/schemas'

// Real v4 UUIDs: zod checks the version and variant nibbles, so a
// made-up digit string is rejected before any of these assertions run.
const uuid = '11111111-2222-4333-8444-555555555555'
const otherUuid = '99999999-8888-4777-9666-555555555555'

const validOrder = {
  customer: { name: 'Bob', email: 'bob@example.com' },
  items: [{ productId: uuid, quantity: 2 }]
}

describe('orderSchema', () => {
  it('accepts a minimal valid order and defaults the optional fields', () => {
    const parsed = orderSchema.parse(validOrder)
    expect(parsed.customer.phone).toBe('')
    expect(parsed.customer.notes).toBe('')
    expect(parsed.subscribe).toBe(false)
    expect(parsed.confirmation).toBeUndefined()
  })

  it('trims the customer fields', () => {
    const parsed = orderSchema.parse({
      ...validOrder,
      customer: { name: '  Bob  ', email: '  bob@example.com  ' }
    })
    expect(parsed.customer.name).toBe('Bob')
    expect(parsed.customer.email).toBe('bob@example.com')
  })

  it('rejects a malformed email', () => {
    expect(orderSchema.safeParse({
      ...validOrder,
      customer: { name: 'Bob', email: 'not-an-email' }
    }).success).toBe(false)
  })

  it('rejects an empty name, including one that is only whitespace', () => {
    expect(orderSchema.safeParse({
      ...validOrder,
      customer: { name: '   ', email: 'bob@example.com' }
    }).success).toBe(false)
  })

  it('rejects an empty cart', () => {
    expect(orderSchema.safeParse({ ...validOrder, items: [] }).success).toBe(false)
  })

  it('rejects a product id that is not a uuid', () => {
    expect(orderSchema.safeParse({
      ...validOrder,
      items: [{ productId: 'not-a-uuid', quantity: 1 }]
    }).success).toBe(false)
  })

  it('rejects a quantity below one, above ninety-nine, or fractional', () => {
    for (const quantity of [0, -1, 100, 1.5]) {
      expect(
        orderSchema.safeParse({ ...validOrder, items: [{ productId: uuid, quantity }] }).success
      ).toBe(false)
    }
  })

  it('rejects a cart of more than fifty lines', () => {
    const items = Array.from({ length: 51 }, () => ({ productId: uuid, quantity: 1 }))
    expect(orderSchema.safeParse({ ...validOrder, items }).success).toBe(false)
  })

  it('rejects a confirmation that is not a uuid', () => {
    expect(orderSchema.safeParse({ ...validOrder, confirmation: 'nope' }).success).toBe(false)
  })

  it('accepts a promo code and trims it', () => {
    expect(orderSchema.parse({ ...validOrder, promoCode: '  welcome25 ' }).promoCode).toBe(
      'welcome25'
    )
  })

  it('rejects a promo code past sixty characters', () => {
    expect(
      orderSchema.safeParse({ ...validOrder, promoCode: 'x'.repeat(61) }).success
    ).toBe(false)
  })
})

describe('mergeItems', () => {
  it('sums the quantities of a repeated product rather than dropping one', () => {
    expect(mergeItems([
      { productId: uuid, quantity: 2 },
      { productId: uuid, quantity: 3 }
    ])).toEqual([{ product_id: uuid, quantity: 5 }])
  })

  it('keeps distinct products separate, in first-seen order', () => {
    expect(mergeItems([
      { productId: otherUuid, quantity: 1 },
      { productId: uuid, quantity: 4 }
    ])).toEqual([
      { product_id: otherUuid, quantity: 1 },
      { product_id: uuid, quantity: 4 }
    ])
  })

  it('renames productId to the product_id create_order expects', () => {
    const [merged] = mergeItems([{ productId: uuid, quantity: 1 }])
    expect(merged).toEqual({ product_id: uuid, quantity: 1 })
    expect('productId' in merged).toBe(false)
  })
})

describe('contactSchema', () => {
  const valid = { name: 'Bob', email: 'bob@example.com', message: 'Hello' }

  it('accepts a valid message and defaults subscribe to false', () => {
    expect(contactSchema.parse(valid).subscribe).toBe(false)
  })

  it('rejects an empty message', () => {
    expect(contactSchema.safeParse({ ...valid, message: '   ' }).success).toBe(false)
  })

  it('rejects a message past four thousand characters', () => {
    expect(contactSchema.safeParse({ ...valid, message: 'x'.repeat(4001) }).success).toBe(false)
  })

  it('rejects a malformed email', () => {
    expect(contactSchema.safeParse({ ...valid, email: 'nope' }).success).toBe(false)
  })
})

describe('emailOptinSchema', () => {
  it('accepts a valid address and trims it', () => {
    expect(emailOptinSchema.parse({ email: '  bob@example.com ' }).email).toBe('bob@example.com')
  })

  it('rejects a malformed address', () => {
    expect(emailOptinSchema.safeParse({ email: 'bob@' }).success).toBe(false)
  })

  it('rejects a missing address', () => {
    expect(emailOptinSchema.safeParse({}).success).toBe(false)
  })
})

describe('catalogueQuerySchema', () => {
  it('accepts an ordinary term and trims it', () => {
    const parsed = catalogueQuerySchema.safeParse({ q: '  dragon ' })
    expect(parsed.success && parsed.data.q).toBe('dragon')
  })

  it('accepts no term at all, which is the unfiltered catalogue', () => {
    expect(catalogueQuerySchema.safeParse({}).success).toBe(true)
  })

  it('rejects a term longer than the cap', () => {
    expect(catalogueQuerySchema.safeParse({ q: 'x'.repeat(201) }).success).toBe(false)
  })
})
