import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useRuntimeConfigReturning } from './setup'
import {
  sendContactEmail,
  sendCustomerEmail,
  sendOrderEmail,
  sendWelcomeEmail,
  type OrderEmailPayload
} from '~~/server/utils/email'

/**
 * Every email names the shop that sent it.
 *
 * This exists because two shops run this code and write to one staff inbox. A
 * notification reading "New order from Ada Lovelace" is useless when it could
 * have come from either: staff cannot sort on it, and cannot tell whose stock
 * to pick.
 *
 * The case worth protecting is the last one. `Store` is the placeholder the
 * template ships with, so it is treated as no name at all rather than as a
 * name, and the subject falls back to what it used to be. An adopter who has
 * not set the variable gets plain mail rather than mail that looks broken.
 */

const send = vi.fn()

vi.mock('resend', () => ({
  Resend: class {
    emails = { send }
  }
}))

// The welcome email asks the database for an active promo code. Nuxt
// auto-imports that, so it is a global rather than a module import and mocking
// the module does not reach it. Nothing here cares which answer it gets, only
// what the subject says.
vi.stubGlobal('getActivePromo', async () => null)

const CONFIG = {
  resendApiKey: 're_test',
  orderFromEmail: 'orders@example.com',
  orderAdminEmail: 'staff@example.com'
}

/** Stubs the config with a given shop name, or none. */
function shopNamed(storeName: string | undefined) {
  // Re-stubbed after each test's unstubAllGlobals, which clears it too.
  vi.stubGlobal('getActivePromo', async () => null)
  useRuntimeConfigReturning({ ...CONFIG, public: { storeName } })
}

const order: OrderEmailPayload = {
  orderId: '6ea89d95-0625-4128-bf22-7b1ac0a57377',
  customer: { name: 'Ada Lovelace', email: 'ada@example.com' },
  items: [
    { name_snapshot: 'Articulated Dragon', file_name_snapshot: null, unit_price_cents: 2400, quantity: 1 }
  ],
  totalCents: 2400
}

/** The subject of the one email sent during a test. */
const subject = () => send.mock.calls[0]?.[0]?.subject as string

beforeEach(() => {
  send.mockReset()
  send.mockResolvedValue({ error: null })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('a shop that has been named', () => {
  beforeEach(() => shopNamed('Forged in Filament'))

  it('files the staff order notification under the shop', async () => {
    await sendOrderEmail(order)
    expect(subject()).toBe('[Forged in Filament] New order from Ada Lovelace ($24.00)')
  })

  it('names the shop to the buyer as a phrase, not a tag', async () => {
    await sendCustomerEmail(order)
    expect(subject()).toBe(`Your Forged in Filament order ${order.orderId} ($24.00)`)
    // A bracket reads as machinery to someone who is not filing an inbox.
    expect(subject()).not.toContain('[')
  })

  it('files a contact message under the shop', async () => {
    await sendContactEmail({ name: 'Ada Lovelace', email: 'ada@example.com', message: 'hello' })
    expect(subject()).toBe('[Forged in Filament] Contact form: Ada Lovelace')
  })

  it('files a custom-order request under the shop', async () => {
    await sendContactEmail({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      message: 'a chainmail lampshade',
      kind: 'custom-order'
    })
    expect(subject()).toBe('[Forged in Filament] Custom order request: Ada Lovelace')
  })

  it('names the shop in the newsletter welcome', async () => {
    await sendWelcomeEmail('ada@example.com')
    expect(subject()).toBe("You're subscribed to Forged in Filament")
  })

  it('tells two shops apart on the same mail', async () => {
    await sendOrderEmail(order)
    const first = subject()

    send.mockReset()
    send.mockResolvedValue({ error: null })
    shopNamed('AI Storefront')
    await sendOrderEmail(order)

    expect(subject()).not.toBe(first)
    expect(subject()).toContain('AI Storefront')
  })
})

describe('a shop still carrying the template placeholder', () => {
  it('falls back to the older subject rather than naming "Store"', async () => {
    shopNamed('Store')
    await sendOrderEmail(order)
    expect(subject()).toBe('New order from Ada Lovelace ($24.00)')
  })

  it('sends the buyer a confirmation that does not read as a bug', async () => {
    shopNamed('Store')
    await sendCustomerEmail(order)
    expect(subject()).toBe(`Your order ${order.orderId} ($24.00)`)
    expect(subject()).not.toContain('Store')
  })
})

describe('a shop with no name configured at all', () => {
  it('still sends, because the order is already committed by then', async () => {
    shopNamed(undefined)
    await sendOrderEmail(order)
    expect(send).toHaveBeenCalledOnce()
    expect(subject()).toBe('New order from Ada Lovelace ($24.00)')
  })

  it('leaves no empty bracket behind', async () => {
    shopNamed('   ')
    await sendContactEmail({ name: 'Ada Lovelace', email: 'ada@example.com', message: 'hello' })
    expect(subject()).toBe('Contact form: Ada Lovelace')
  })
})
