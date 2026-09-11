import { beforeAll, describe, expect, it } from 'vitest'
import { BASE_URL, db } from '../db/client'

/**
 * Two real calls to the provider, through the running dev server.
 *
 * Everything about the assistant that can be checked for free is checked in
 * tests/unit. What is left, and what these buy, is whether the model still
 * calls the tools at all: the unit tests would pass in full if the model
 * stopped requesting `propose_cart_change` tomorrow, and the shop's assistant
 * would be quietly useless.
 *
 * They assert on structure, never on wording. Pinning phrasing would fail on
 * the provider's next revision and teach nothing.
 */

let catalogueIds: Set<string>
let productName: string

const ask = (messages: { role: string; content: string }[], items?: unknown[]) =>
  fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ messages, ...(items ? { items } : {}) })
  })

interface ChatReply {
  reply: string
  intents: { action: string; productId: string; quantity: number; name: string }[]
  draft: unknown | null
}

beforeAll(async () => {
  const health = await fetch(`${BASE_URL}/api/products`).catch(() => null)
  if (!health?.ok) {
    throw new Error(`no dev server answering at ${BASE_URL}; run "npm run dev" first`)
  }

  const { data } = await db().from('products').select('id, name, kind, in_stock')
  const products = data ?? []
  catalogueIds = new Set(products.map(p => p.id))

  const sellable = products.find(p => p.kind === 'physical' && p.in_stock)
  if (!sellable) throw new Error('no in-stock physical product to ask about')
  productName = sellable.name
})

describe('the assistant, against the real provider', () => {
  it('answers a catalogue question without proposing anything', async () => {
    const response = await ask([{ role: 'user', content: 'What sorts of things do you sell?' }])
    expect(response.status).toBe(200)

    const body = (await response.json()) as ChatReply
    expect(body.reply.trim().length).toBeGreaterThan(0)
    // A question is not an instruction: nothing should be proposed or drafted.
    expect(body.intents).toEqual([])
    expect(body.draft).toBeNull()
  })

  it('proposes a cart change naming a real product when asked to add one', async () => {
    const response = await ask([
      { role: 'user', content: `Please add one ${productName} to my cart.` }
    ])
    expect(response.status).toBe(200)

    const body = (await response.json()) as ChatReply
    expect(body.intents).toHaveLength(1)

    const [intent] = body.intents
    expect(intent.action).toBe('add')
    expect(intent.quantity).toBeGreaterThan(0)
    // The id can only have come from the catalogue: the model never sees one.
    expect(catalogueIds.has(intent.productId)).toBe(true)
    expect(intent.name).toBe(productName)

    // Proposed, not applied. The storefront is what changes the cart.
    expect(body.draft).toBeNull()
  })
})
