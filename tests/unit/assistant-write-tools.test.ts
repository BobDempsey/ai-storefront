import { afterEach, describe, expect, it, vi } from 'vitest'
import { dragon, file, outOfStock, stubCatalogue } from './catalogue-stub'
import { runTool, type ToolContext } from '~~/server/utils/assistant'

/**
 * The two tools that change something. Neither writes to the catalogue, the
 * cart or an order: `propose_cart_change` pushes an intent the storefront
 * applies, and `draft_order` builds a draft only the visitor can confirm.
 * These are the rules that make a language model safe to put in front of a
 * shop, so they are asserted rather than assumed.
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

describe('propose_cart_change', () => {
  it('pushes exactly one intent for a valid add', async () => {
    stubCatalogue()
    const ctx = context()
    const result = (await call(
      'propose_cart_change',
      { action: 'add', slug: 'articulated-dragon', quantity: 2 },
      ctx
    )) as any

    expect(ctx.intents).toHaveLength(1)
    expect(result).toMatchObject({ applied: 'add', item: 'Articulated Dragon', quantity: 2 })
  })

  /**
   * The whole point of resolving the slug in the tool. The model names items by
   * slug and never handles an id, so the id on the intent can only have come
   * from the database.
   */
  it('carries the id the database returned, never one from the arguments', async () => {
    stubCatalogue()
    const ctx = context()
    await call(
      'propose_cart_change',
      { action: 'add', slug: 'articulated-dragon', productId: 'deadbeef-0000-4000-8000-000000000000' },
      ctx
    )

    expect(ctx.intents[0].productId).toBe(dragon.id)
  })

  it('refuses a slug the catalogue does not have, and pushes nothing', async () => {
    stubCatalogue()
    const ctx = context()
    expect(await call('propose_cart_change', { action: 'add', slug: 'invented' }, ctx)).toEqual({
      error: 'The shop does not have that item.'
    })
    expect(ctx.intents).toEqual([])
  })

  it('refuses an out-of-stock physical product by name, and pushes nothing', async () => {
    stubCatalogue()
    const ctx = context()
    expect(await call('propose_cart_change', { action: 'add', slug: 'desk-tidy' }, ctx)).toEqual({
      error: `${outOfStock.name} is out of stock.`
    })
    expect(ctx.intents).toEqual([])
  })

  it('caps a file at one and says why', async () => {
    stubCatalogue()
    const ctx = context()
    const result = (await call(
      'propose_cart_change',
      { action: 'add', slug: 'dragon-stl', quantity: 5 },
      ctx
    )) as any

    expect(ctx.intents[0]).toMatchObject({ productId: file.id, quantity: 1, single: true })
    expect(result.note).toBe('A file can only be ordered once.')
  })

  it('does not add the note when only one file was asked for', async () => {
    stubCatalogue()
    const ctx = context()
    const result = (await call(
      'propose_cart_change',
      { action: 'add', slug: 'dragon-stl', quantity: 1 },
      ctx
    )) as any
    expect(result.note).toBeUndefined()
  })

  it('clamps a physical quantity to the 1..99 the cart accepts', async () => {
    stubCatalogue()
    const high = context()
    await call('propose_cart_change', { action: 'set', slug: 'articulated-dragon', quantity: 99 }, high)
    expect(high.intents[0].quantity).toBe(99)

    const none = context()
    await call('propose_cart_change', { action: 'set', slug: 'articulated-dragon' }, none)
    expect(none.intents[0].quantity).toBe(1)
  })

  it('turns remove into quantity zero, with the fields the storefront needs', async () => {
    stubCatalogue()
    const ctx = context()
    await call('propose_cart_change', { action: 'remove', slug: 'articulated-dragon' }, ctx)

    expect(ctx.intents[0]).toEqual({
      action: 'remove',
      productId: dragon.id,
      quantity: 0,
      name: 'Articulated Dragon',
      single: false
    })
  })
})

describe('draft_order', () => {
  const customer = { name: 'Bob', email: 'bob@example.com' }

  it('refuses an empty cart and sets no draft', async () => {
    stubCatalogue()
    const ctx = context()
    expect(await call('draft_order', customer, ctx)).toEqual({
      error: 'The cart is empty, so there is nothing to order.'
    })
    expect(ctx.draft).toBeNull()
  })

  it('refuses a cart holding an unavailable line, naming it, and sets no draft', async () => {
    stubCatalogue()
    const ctx = context([
      { productId: dragon.id, quantity: 1 },
      { productId: outOfStock.id, quantity: 1 }
    ])
    const result = (await call('draft_order', customer, ctx)) as any

    expect(result.error).toContain(outOfStock.name)
    expect(result.error).toContain('must be removed first')
    expect(ctx.draft).toBeNull()
  })

  it('builds a draft whose total is the sum of its lines', async () => {
    stubCatalogue()
    const ctx = context([
      { productId: dragon.id, quantity: 2 },
      { productId: file.id, quantity: 1 }
    ])
    await call('draft_order', customer, ctx)

    expect(ctx.draft!.customer).toMatchObject(customer)
    expect(ctx.draft!.lines).toHaveLength(2)
    expect(ctx.draft!.totalCents).toBe(
      ctx.draft!.lines.reduce((sum, line) => sum + line.amountCents, 0)
    )
    expect(ctx.draft!.totalCents).toBe(1920 * 2 + 800)
  })

  it('prices the draft at the sale price when a sale is on', async () => {
    stubCatalogue({ sale: { saleActive: true, salePercent: 20 } })
    const ctx = context([{ productId: dragon.id, quantity: 1 }])
    await call('draft_order', customer, ctx)
    expect(ctx.draft!.totalCents).toBe(1536)
  })

  /**
   * The tool result is what goes into the message history the provider sees.
   * A confirmation appearing here would hand the model the one value that
   * submitting an order requires.
   */
  it('returns no confirmation anywhere in its result', async () => {
    stubCatalogue()
    const ctx = context([{ productId: dragon.id, quantity: 1 }])
    const result = (await call('draft_order', customer, ctx)) as any

    expect(result).toEqual({ drafted: true, note: expect.any(String) })
    expect(JSON.stringify(result).toLowerCase()).not.toContain('confirmation')
  })

  it('tells the model not to claim the order was placed', async () => {
    stubCatalogue()
    const ctx = context([{ productId: dragon.id, quantity: 1 }])
    const result = (await call('draft_order', customer, ctx)) as any
    expect(result.note).toContain('do not say the order is placed')
  })
})
