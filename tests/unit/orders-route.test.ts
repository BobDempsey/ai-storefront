import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useRuntimeConfigReturning } from './setup'

/**
 * Covers which emails the order route sends, and the guarantee that neither
 * send can affect the committed order or the other email. Everything the route
 * reaches for is stubbed, so nothing here touches Supabase, Resend or a socket.
 *
 * The route is a Nitro handler built from Nuxt auto-imports, so the globals it
 * expects are stubbed before the module is imported and it is re-imported per
 * test. `defineEventHandler` is stubbed to the identity function, which hands
 * back the handler itself to call directly.
 */

const sendOrderEmail = vi.fn()
const sendCustomerEmail = vi.fn()

vi.mock('~~/server/utils/email', () => ({ sendOrderEmail, sendCustomerEmail }))

const ORDER_ID = '6ea89d95-0625-4128-bf22-7b1ac0a57377'
const PRODUCT_ID = '9c1b5a2e-7d3f-4a61-9e08-2f4b6c8d0a13'

const body = {
  customer: { name: 'Ada Lovelace', email: 'ada@example.com' },
  items: [{ productId: PRODUCT_ID, quantity: 2 }]
}

const committedOrder = {
  total_cents: 4800,
  discount_source: null,
  discount_percent: null,
  promo_code_snapshot: null,
  subtotal_cents: null
}

const committedItems = [
  {
    name_snapshot: 'Articulated Dragon',
    file_name_snapshot: null,
    unit_price_cents: 2400,
    quantity: 2
  }
]

/** What the route asked `create_order` for, so a test can read `p_is_test`. */
const rpcArgs: Record<string, unknown>[] = []

/** Every call the route made to the rate limiter, so exemption is observable. */
const rateLimitCalls: unknown[] = []

/** A Supabase client shaped like the chains the order route builds. */
function supabaseStub(options: { order?: unknown; orderError?: unknown; itemsError?: unknown }) {
  return {
    rpc: async (_name: string, args: Record<string, unknown>) => {
      rpcArgs.push(args)
      return { data: ORDER_ID, error: null }
    },
    from(table: string) {
      const result =
        table === 'orders'
          ? { data: options.order ?? committedOrder, error: options.orderError ?? null }
          : { data: committedItems, error: options.itemsError ?? null }

      // Thenable as well as chainable: the order is read with `.single()`, the
      // items by awaiting the filtered builder itself.
      const builder: Record<string, unknown> = {
        select: () => builder,
        eq: () => builder,
        in: () => builder,
        single: async () => result,
        then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
          Promise.resolve(result).then(resolve, reject)
      }
      return builder
    }
  }
}

/** Imports the route with its Nuxt globals in place, and returns the handler. */
async function loadRoute(options: {
  headers?: Record<string, string>
  order?: unknown
  orderError?: unknown
  itemsError?: unknown
  runtimeConfig?: Record<string, unknown>
} = {}) {
  const headers = options.headers ?? {}

  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
  vi.stubGlobal('getHeader', (_event: unknown, name: string) => headers[name.toLowerCase()])
  vi.stubGlobal('readBody', async () => body)
  vi.stubGlobal('rateLimitByCaller', (...args: unknown[]) => {
    rateLimitCalls.push(args)
  })
  vi.stubGlobal('useSupabase', () => supabaseStub(options))
  // `public` always exists at runtime, so it always exists here: a test that
  // omitted it would pass against a shape production never produces.
  const config = options.runtimeConfig ?? { testOrderToken: 'secret-token' }
  useRuntimeConfigReturning({ public: {}, ...config })

  vi.resetModules()
  const module = await import('~~/server/api/orders.post')
  return module.default as (event: unknown) => Promise<{ orderId: string; totalCents?: number }>
}

beforeEach(() => {
  sendOrderEmail.mockResolvedValue(undefined)
  sendCustomerEmail.mockResolvedValue(undefined)
  rpcArgs.length = 0
  rateLimitCalls.length = 0
})

afterEach(() => {
  vi.restoreAllMocks()
  sendOrderEmail.mockReset()
  sendCustomerEmail.mockReset()
})

describe('an ordinary order', () => {
  it('sends the staff notification and the buyer confirmation', async () => {
    const handler = await loadRoute()

    await expect(handler({})).resolves.toEqual({ orderId: ORDER_ID, totalCents: 4800 })

    expect(sendOrderEmail).toHaveBeenCalledTimes(1)
    expect(sendCustomerEmail).toHaveBeenCalledTimes(1)
  })

  it('confirms to the buyer with the same figures it gives staff', async () => {
    const handler = await loadRoute({
      order: {
        total_cents: 4800,
        discount_source: 'code',
        discount_percent: 25,
        promo_code_snapshot: 'WELCOME25',
        subtotal_cents: 6400
      }
    })

    await handler({})

    const staff = sendOrderEmail.mock.calls[0]![0]
    const buyer = sendCustomerEmail.mock.calls[0]![0]
    expect(buyer.orderId).toBe(staff.orderId)
    expect(buyer.totalCents).toBe(staff.totalCents)
    expect(buyer.items).toEqual(staff.items)
    expect(buyer.discount).toEqual(staff.discount)
    expect(buyer.customer.email).toBe('ada@example.com')
  })

  // The staff notification carries this to drive its warning banner; the
  // buyer's copy has no such concept and must not be handed one.
  it('passes no incomplete flag to the buyer', async () => {
    const handler = await loadRoute()

    await handler({})

    expect(sendCustomerEmail.mock.calls[0]![0]).not.toHaveProperty('incomplete')
  })
})

describe('suppression', () => {
  it('sends neither email for a test order', async () => {
    const handler = await loadRoute({ headers: { 'x-test-order-token': 'secret-token' } })

    await expect(handler({})).resolves.toEqual({ orderId: ORDER_ID, totalCents: 4800 })

    expect(sendOrderEmail).not.toHaveBeenCalled()
    expect(sendCustomerEmail).not.toHaveBeenCalled()
  })

  // Staff still get theirs, with its warning banner and a dashboard to check.
  // The buyer would get a $0.00 order with no lines, so they get nothing.
  it('sends the buyer nothing when the order could not be re-read', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const handler = await loadRoute({ orderError: { message: 'read failed' } })

    await expect(handler({})).resolves.toEqual({ orderId: ORDER_ID })

    expect(sendOrderEmail).toHaveBeenCalledTimes(1)
    expect(sendOrderEmail.mock.calls[0]![0].incomplete).toBe(true)
    expect(sendCustomerEmail).not.toHaveBeenCalled()
  })

  it('sends the buyer nothing when the line items could not be re-read', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const handler = await loadRoute({ itemsError: { message: 'read failed' } })

    await handler({})

    expect(sendCustomerEmail).not.toHaveBeenCalled()
  })
})

describe('neither email can affect the order or the other email', () => {
  it('still confirms to the buyer when the staff notification throws', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})
    sendOrderEmail.mockRejectedValue(new Error('resend is down'))
    const handler = await loadRoute()

    await expect(handler({})).resolves.toEqual({ orderId: ORDER_ID, totalCents: 4800 })

    expect(sendCustomerEmail).toHaveBeenCalledTimes(1)
    expect(logged).toHaveBeenCalled()
  })

  it('still returns the order when the buyer confirmation throws', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})
    sendCustomerEmail.mockRejectedValue(new Error('resend is down'))
    const handler = await loadRoute()

    await expect(handler({})).resolves.toEqual({ orderId: ORDER_ID, totalCents: 4800 })

    expect(sendOrderEmail).toHaveBeenCalledTimes(1)
    expect(logged).toHaveBeenCalled()
  })
})

/**
 * Which orders count as business, and which do not.
 *
 * Two conditions decide it and they are deliberately not the same boolean: the
 * secret also skips the rate limiter, and the deployment must not. Production
 * is the case that needs no configuration, so the tests that matter most are
 * the ones asserting nothing happens when nothing is set.
 */
describe('what makes an order a test', () => {
  const isTest = () => rpcArgs[0]!.p_is_test

  it('does not, on the live shop, with no token', async () => {
    const handler = await loadRoute()

    await handler({})

    expect(isTest()).toBe(false)
    expect(sendOrderEmail).toHaveBeenCalledTimes(1)
  })

  it('does, for a request carrying the token the server holds', async () => {
    const handler = await loadRoute({ headers: { 'x-test-order-token': 'secret-token' } })

    await handler({})

    expect(isTest()).toBe(true)
    expect(sendOrderEmail).not.toHaveBeenCalled()
  })

  it('does, on a development deployment, with no token at all', async () => {
    const handler = await loadRoute({
      runtimeConfig: { testOrderToken: 'secret-token', public: { deployEnv: 'development' } }
    })

    await handler({})

    expect(isTest()).toBe(true)
    expect(sendOrderEmail).not.toHaveBeenCalled()
    expect(sendCustomerEmail).not.toHaveBeenCalled()
  })

  it('does, on a preview deployment', async () => {
    const handler = await loadRoute({
      runtimeConfig: { testOrderToken: 'secret-token', public: { deployEnv: 'preview' } }
    })

    await handler({})

    expect(isTest()).toBe(true)
  })

  it('does not, when the deployment names itself production', async () => {
    const handler = await loadRoute({
      runtimeConfig: { testOrderToken: 'secret-token', public: { deployEnv: 'production' } }
    })

    await handler({})

    expect(isTest()).toBe(false)
    expect(sendOrderEmail).toHaveBeenCalledTimes(1)
  })

  it('cannot be claimed by the request', async () => {
    // The environment is the server's own. A browser that sends these gets an
    // ordinary order, which is what stops an unbilled, unnotified order being
    // placed by anyone who reads the source.
    const handler = await loadRoute({
      headers: { 'x-deploy-env': 'development', 'x-vercel-env': 'preview' },
      runtimeConfig: { testOrderToken: 'secret-token', public: { deployEnv: '' } }
    })

    await handler({})

    expect(isTest()).toBe(false)
    expect(sendOrderEmail).toHaveBeenCalledTimes(1)
  })
})

describe('who skips the rate limiter', () => {
  it('the token does', async () => {
    const handler = await loadRoute({ headers: { 'x-test-order-token': 'secret-token' } })

    await handler({})

    expect(rateLimitCalls).toHaveLength(0)
  })

  it('a development deployment does not, though its orders are tests', async () => {
    // A person clicking through a dev server should meet the limiter a customer
    // meets. Exempting them would mean it is never exercised outside CI.
    const handler = await loadRoute({
      runtimeConfig: { testOrderToken: 'secret-token', public: { deployEnv: 'development' } }
    })

    await handler({})

    expect(rpcArgs[0]!.p_is_test).toBe(true)
    expect(rateLimitCalls).toHaveLength(1)
  })

  it('an ordinary caller does not', async () => {
    const handler = await loadRoute()

    await handler({})

    expect(rateLimitCalls).toHaveLength(1)
  })
})
