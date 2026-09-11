import { afterEach, describe, expect, it, vi } from 'vitest'
import { dragon, stubCatalogue } from './catalogue-stub'
import { SYSTEM_PROMPT, TOOLS, TOOL_NAMES, runTool, type ToolContext } from '~~/server/utils/assistant'

/**
 * The boundary that lets a visitor use a promo code through the assistant panel
 * without the assistant being able to produce one.
 *
 * The code is typed into a field on the draft card and travels to the server on
 * the same requests the checkout page makes. It never reaches this module. So
 * the thing to assert here is an absence: no tool takes a code, no tool result
 * carries one, and the tool list did not grow. A model that is argued into
 * anything still has nothing to apply, invent or test.
 */

const context = (items: { productId: string; quantity: number }[] = []): ToolContext => ({
  items,
  intents: [],
  draft: null
})

const call = (name: string, args: unknown, ctx: ToolContext) =>
  runTool(name, JSON.stringify(args), ctx)

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('the tool list', () => {
  // The repository's security argument is "the assistant's permissions are its
  // tool list". Pinning the list is what keeps that sentence true: adding a
  // promo tool has to be a deliberate edit here, not a quiet one elsewhere.
  it('is exactly the five tools, with no promo tool among them', () => {
    expect([...TOOL_NAMES]).toEqual([
      'search_catalogue',
      'get_product',
      'get_cart',
      'propose_cart_change',
      'draft_order'
    ])
    expect(TOOLS.map(t => t.function.name)).toEqual([...TOOL_NAMES])
  })

  it('declares no parameter anywhere that could carry a code', () => {
    const parameterNames = TOOLS.flatMap(t =>
      Object.keys((t.function.parameters as { properties?: object }).properties ?? {})
    )

    for (const name of parameterNames) {
      expect(name).not.toMatch(/promo|code|coupon|discount|voucher/i)
    }
  })

  it('describes no tool as applying, checking or redeeming anything', () => {
    for (const tool of TOOLS) {
      expect(tool.function.description ?? '').not.toMatch(/promo|coupon|voucher|redeem/i)
    }
  })
})

describe('draft_order', () => {
  it('ignores a promo code passed as an argument, and drafts without one', async () => {
    stubCatalogue()
    const ctx = context([{ productId: dragon.id, quantity: 1 }])

    const result = await call(
      'draft_order',
      {
        name: 'Ada',
        email: 'ada@example.com',
        promoCode: 'WELCOME25',
        promo_code: 'WELCOME25',
        discountPercent: 90
      },
      ctx
    )

    expect(result).toMatchObject({ drafted: true })
    expect(JSON.stringify(ctx.draft)).not.toMatch(/WELCOME25|promo|discount/i)
    // The draft's total is the catalogue price, untouched by anything the
    // model put in the call.
    expect(ctx.draft!.totalCents).toBe(dragon.price_cents)
  })

  it('produces a draft carrying no code field at all', async () => {
    stubCatalogue()
    const ctx = context([{ productId: dragon.id, quantity: 1 }])

    await call('draft_order', { name: 'Ada', email: 'ada@example.com' }, ctx)

    expect(ctx.draft).not.toHaveProperty('promoCode')
    expect(ctx.draft).not.toHaveProperty('discount')
    expect(Object.keys(ctx.draft!)).toEqual(['customer', 'lines', 'totalCents'])
  })
})

describe('what every tool hands back', () => {
  // A code reaching the model through a tool result would be the same leak as
  // handing it a tool, so the results are checked too, not just the inputs.
  it('never contains a promo code, for any tool', async () => {
    const calls: [string, unknown][] = [
      ['search_catalogue', { query: 'dragon' }],
      ['get_product', { slug: dragon.slug }],
      ['get_cart', {}],
      ['propose_cart_change', { action: 'add', slug: dragon.slug, quantity: 1 }],
      ['draft_order', { name: 'Ada', email: 'ada@example.com' }]
    ]

    for (const [name, args] of calls) {
      stubCatalogue()
      const ctx = context([{ productId: dragon.id, quantity: 1 }])
      const result = await call(name, args, ctx)
      expect(JSON.stringify(result)).not.toMatch(/promo|coupon|voucher|WELCOME/i)
    }
  })
})

describe('the standing instruction', () => {
  it('still forbids reading, creating, changing, applying and redeeming a code', () => {
    for (const verb of ['read', 'create', 'change', 'activate', 'deactivate', 'apply', 'redeem']) {
      expect(SYSTEM_PROMPT).toMatch(new RegExp(verb, 'i'))
    }
    expect(SYSTEM_PROMPT).toMatch(/never told what any code is/i)
    expect(SYSTEM_PROMPT).toMatch(/never state a code, invent one/i)
  })

  it('forbids saying whether a code exists, which is what makes it an oracle', () => {
    expect(SYSTEM_PROMPT).toMatch(/say whether a code exists or\s+works/i)
    expect(SYSTEM_PROMPT).toMatch(/\bcheck\b/i)
  })

  it('points a visitor who types a code at the field instead of acting on it', () => {
    expect(SYSTEM_PROMPT).toMatch(/types a code at you, do not act on\s+it/i)
    expect(SYSTEM_PROMPT).toMatch(/promo field on the order draft/i)
  })

  it('carries no code of its own', () => {
    expect(SYSTEM_PROMPT).not.toMatch(/WELCOME|[A-Z0-9]{6,}\d{2}\b/)
  })
})
