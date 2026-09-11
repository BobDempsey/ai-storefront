import { afterEach, describe, expect, it, vi } from 'vitest'
import { CATALOGUE, dragon, file, outOfStock, stubCatalogue } from './catalogue-stub'
import { runTool, type ToolContext } from '~~/server/utils/assistant'

const context = (items: { productId: string; quantity: number }[] = []): ToolContext => ({
  items,
  intents: [],
  draft: null
})

const call = (name: string, args: unknown, ctx = context()) =>
  runTool(name, typeof args === 'string' ? args : JSON.stringify(args), ctx)

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('the stub itself', () => {
  it('prices at the catalogue price with no sale on', async () => {
    stubCatalogue()
    const result = (await call('get_product', { slug: 'articulated-dragon' })) as any
    expect(result.price).toBe('$19.20')
    expect(result.originalPrice).toBeUndefined()
  })

  it('prices at the sale price when the sale is on', async () => {
    stubCatalogue({ sale: { saleActive: true, salePercent: 20 } })
    const result = (await call('get_product', { slug: 'articulated-dragon' })) as any
    expect(result.price).toBe('$15.36')
    expect(result.originalPrice).toBe('$19.20')
    expect(result.salePercent).toBe(20)
  })
})

describe('search_catalogue', () => {
  it('returns the whole catalogue with no term', async () => {
    stubCatalogue()
    const result = (await call('search_catalogue', {})) as any
    expect(result.items).toHaveLength(CATALOGUE.length)
  })

  it('returns only what matches a term, by name or description', async () => {
    stubCatalogue()
    expect(((await call('search_catalogue', { query: 'dragon' })) as any).items.map((i: any) => i.slug))
      .toEqual(['articulated-dragon', 'dragon-stl'])
    expect(((await call('search_catalogue', { query: 'sold out' })) as any).items.map((i: any) => i.slug))
      .toEqual(['desk-tidy'])
  })

  // So the assistant can say what the shop does have, rather than only what it
  // does not.
  it('falls back to the whole catalogue when a term matches nothing', async () => {
    stubCatalogue()
    const result = (await call('search_catalogue', { query: 'helicopter' })) as any
    expect(result.items).toHaveLength(CATALOGUE.length)
    expect(result.error).toBeUndefined()
  })

  it('filters by kind', async () => {
    stubCatalogue()
    const result = (await call('search_catalogue', { kind: 'digital' })) as any
    expect(result.items.map((i: any) => i.slug)).toEqual(['dragon-stl'])
  })

  it('never exposes a product id to the model', async () => {
    stubCatalogue()
    const result = (await call('search_catalogue', {})) as any
    for (const item of result.items) {
      expect(item.id).toBeUndefined()
      expect(JSON.stringify(item)).not.toContain(dragon.id)
    }
  })

  it('reports a read failure as an error rather than throwing', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    stubCatalogue({ error: { message: 'boom' } })
    expect((await call('search_catalogue', {})) as any).toEqual({
      error: 'The catalogue could not be read.'
    })
  })
})

describe('get_product', () => {
  it('describes a real slug', async () => {
    stubCatalogue()
    const result = (await call('get_product', { slug: 'articulated-dragon' })) as any
    expect(result.name).toBe('Articulated Dragon')
    expect(result.available).toBe(true)
  })

  // The guarantee that matters: the model cannot conjure an item.
  it('refuses a slug the catalogue does not have', async () => {
    stubCatalogue()
    expect((await call('get_product', { slug: 'invented-item' })) as any).toEqual({
      error: 'The shop does not have that item.'
    })
  })

  it('reports a file as always available, with its delivery terms', async () => {
    stubCatalogue()
    const result = (await call('get_product', { slug: 'dragon-stl' })) as any
    expect(result.available).toBe(true)
    expect(result.file).toBe('dragon.stl')
    expect(result.delivery).toContain('once per order')
  })

  it('reports an out-of-stock product as unavailable rather than hiding it', async () => {
    stubCatalogue()
    const result = (await call('get_product', { slug: 'desk-tidy' })) as any
    expect(result.available).toBe(false)
    expect(result.name).toBe(outOfStock.name)
  })
})

describe('get_cart', () => {
  it('reports an empty cart as empty, not as an error', async () => {
    stubCatalogue()
    const result = (await call('get_cart', {}, context())) as any
    expect(result.lines).toEqual([])
    expect(result.subtotal).toBe('$0.00')
  })

  it('prices the lines and totals them', async () => {
    stubCatalogue()
    const result = (await call(
      'get_cart',
      {},
      context([
        { productId: dragon.id, quantity: 2 },
        { productId: file.id, quantity: 1 }
      ])
    )) as any

    expect(result.lines).toHaveLength(2)
    expect(result.lines[0]).toMatchObject({ name: 'Articulated Dragon', quantity: 2, amount: '$38.40' })
    expect(result.subtotal).toBe('$46.40')
  })

  it('always reports a file as available', async () => {
    stubCatalogue()
    const result = (await call('get_cart', {}, context([{ productId: file.id, quantity: 1 }]))) as any
    expect(result.lines[0].available).toBe(true)
  })

  it('leaves an out-of-stock line out of the subtotal but still shows it', async () => {
    stubCatalogue()
    const result = (await call(
      'get_cart',
      {},
      context([
        { productId: dragon.id, quantity: 1 },
        { productId: outOfStock.id, quantity: 1 }
      ])
    )) as any

    expect(result.lines).toHaveLength(2)
    expect(result.lines.find((l: any) => l.slug === 'desk-tidy').available).toBe(false)
    expect(result.subtotal).toBe('$19.20')
  })
})

describe('argument handling', () => {
  it('reports malformed JSON as an error rather than throwing', async () => {
    stubCatalogue()
    for (const name of ['search_catalogue', 'get_product', 'propose_cart_change', 'draft_order']) {
      await expect(runTool(name, '{not json', context())).resolves.toEqual({
        error: 'Those arguments were not valid.'
      })
    }
  })

  it('reports arguments the schema rejects as an error', async () => {
    stubCatalogue()
    expect(await call('get_product', { slug: '' })).toEqual({ error: 'Invalid arguments.' })
    expect(await call('propose_cart_change', { action: 'destroy', slug: 'x' })).toEqual({
      error: 'Invalid arguments.'
    })
    expect(await call('draft_order', { name: 'Bob', email: 'not-an-email' })).toEqual({
      error: 'A name and a valid email address are needed.'
    })
  })

  it('reports an unknown tool rather than throwing', async () => {
    stubCatalogue()
    expect(await call('delete_everything', {})).toEqual({ error: 'Unknown tool.' })
  })
})
