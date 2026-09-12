import {
  searchCatalogueArgs,
  getProductArgs,
  proposeCartChangeArgs,
  draftOrderArgs,
  type cartItemsSchema
} from '~~/server/utils/schemas'
import type { z } from 'zod'
import type { SaleState } from '~~/server/utils/pricing'
import { matchesSearch, normalizeSearchTerm } from '~~/server/utils/search'
import { withProductKind, type ProductKind, type ProductRow } from '~~/server/utils/rows'

/**
 * The assistant's tool list is its whole permission model. Nothing here writes
 * to the catalogue, the cart or an order:
 *
 *   - the three read tools return catalogue and cart figures as the storefront
 *     itself would show them
 *   - propose_cart_change returns an intent; the browser applies it through the
 *     ordinary cart store, so every cart rule still holds
 *   - draft_order returns a draft; only the visitor's click submits it
 *
 * There is deliberately no submit tool. A model cannot place an order here
 * because nothing it can emit reaches the order route.
 */
export const TOOL_NAMES = [
  'search_catalogue',
  'get_product',
  'get_cart',
  'propose_cart_change',
  'draft_order'
] as const

export type ToolName = (typeof TOOL_NAMES)[number]

export const SYSTEM_PROMPT = `You are the shopping assistant for a small 3D-printing shop.

You help with this shop only: what it sells, what an item is, what is in the
visitor's cart, and how ordering works. If asked about anything else, say in one
sentence that you can only help with the shop, then offer to help with it. Do not
answer the off-topic question, even partially.

Rules you must follow:
- Never state a price, a size, a total or an item you were not given by a tool.
  If you do not know, look it up or say you do not know.
- Never promise a delivery date, a discount, a refund or anything about payment
  beyond this: the shop replies by email to confirm and to arrange payment, and
  nothing is charged on the site.
- Promo codes: you may say the shop emails a code to anyone who joins the
  mailing list, and that a code is typed into the promo field on the checkout
  page or into the promo field on the order draft. That is all. You have no way
  to read, create, change, activate, deactivate, check, apply or redeem a code,
  and you are never told what any code is. Asked to do any of that, say only
  staff can and point the visitor at the opt-in form, the checkout page or the
  promo field on their draft. If a visitor types a code at you, do not act on
  it and do not repeat it: tell them to type it into the promo field on the
  draft instead. Never state a code, invent one, say whether a code exists or
  works, or quote a total that a code produced.
- Files are emailed after payment is arranged. There is no download.
- A file can only be ordered once. Do not offer two of the same file.
- To change the cart, call propose_cart_change. It does not change anything by
  itself; the shop applies it and the visitor sees the result.
- When a visitor wants to order, collect a name and an email. Tell them a phone
  number and a note are optional. Then call draft_order once. You cannot place
  the order. The visitor confirms the draft themselves, and you must say so
  rather than claiming the order is placed.
- Keep replies short. Two or three sentences unless asked for more.`

/** The definitions handed to the provider, in its function-tool shape. */
export const TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'search_catalogue',
      description:
        'List items the shop sells, optionally filtered by a search term or by kind. Returns name, slug, price, availability and, for files, the file details.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Words to match in the name or description' },
          kind: {
            type: 'string',
            enum: ['physical', 'digital'],
            description: 'physical for printed objects, digital for downloadable files'
          }
        },
        additionalProperties: false
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_product',
      description: 'Full details for one item, by its slug.',
      parameters: {
        type: 'object',
        properties: { slug: { type: 'string' } },
        required: ['slug'],
        additionalProperties: false
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_cart',
      description:
        "The visitor's current cart, priced by the shop. Use this rather than adding prices up yourself.",
      parameters: { type: 'object', properties: {}, additionalProperties: false }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'propose_cart_change',
      description:
        'Propose adding, removing or setting the quantity of an item. This does not change the cart by itself; the shop applies it.',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['add', 'remove', 'set'] },
          slug: { type: 'string' },
          quantity: { type: 'number', description: 'Required for set, optional for add' }
        },
        required: ['action', 'slug'],
        additionalProperties: false
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'draft_order',
      description:
        'Draft an order from the current cart for the visitor to review. This does NOT place the order: the visitor must confirm it themselves.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string' },
          notes: { type: 'string' }
        },
        required: ['name', 'email'],
        additionalProperties: false
      }
    }
  }
]

type CartItems = z.infer<typeof cartItemsSchema>

export interface CartIntent {
  action: 'add' | 'remove' | 'set'
  productId: string
  quantity: number
  /** So the drawer can say what changed without another lookup. */
  name: string
  single: boolean
}

export interface OrderDraft {
  customer: { name: string; email: string; phone?: string; notes?: string }
  lines: Array<{ name: string; quantity: number; amountCents: number }>
  totalCents: number
}

export interface ToolContext {
  items: CartItems
  intents: CartIntent[]
  draft: OrderDraft | null
}

const CATALOGUE_COLUMNS =
  'id, slug, name, description, price_cents, in_stock, kind, file_name, file_format, file_size_bytes'

/**
 * A row as `CATALOGUE_COLUMNS` selects it, built from the generated `products`
 * row so a renamed or dropped column fails here. `kind` is narrowed from the
 * generated `string`, which is all a check constraint can produce; see
 * `server/utils/rows.ts`.
 */
export type CatalogueRow = Omit<
  Pick<
    ProductRow,
    | 'id'
    | 'slug'
    | 'name'
    | 'description'
    | 'price_cents'
    | 'in_stock'
    | 'kind'
    | 'file_name'
    | 'file_format'
    | 'file_size_bytes'
  >,
  'kind'
> & { kind: ProductKind }

/** What the model is allowed to see about an item. No ids: it names items by slug. */
function present(product: CatalogueRow, sale: SaleState) {
  const priceCents = salePriceCents(product.price_cents, sale)
  return {
    slug: product.slug,
    name: product.name,
    description: product.description,
    price: `$${(priceCents / 100).toFixed(2)}`,
    ...(sale.saleActive
      ? { originalPrice: `$${(product.price_cents / 100).toFixed(2)}`, salePercent: sale.salePercent }
      : {}),
    kind: product.kind,
    available: product.kind === 'digital' ? true : product.in_stock,
    ...(product.kind === 'digital'
      ? {
          file: product.file_name,
          format: product.file_format,
          delivery: 'emailed after payment is arranged, once per order'
        }
      : {})
  }
}

/**
 * Prices the cart exactly as `/api/cart/preview` does, so the figure the model
 * is given is the figure the cart page shows. Each line's `product.price_cents`
 * comes back already discounted, same as that route.
 */
async function priceCart(items: CartItems, sale: SaleState) {
  if (!items.length) return { lines: [], subtotalCents: 0 }

  const merged = mergeItems(items)
  const { data, error } = await useSupabase()
    .from('products')
    .select(CATALOGUE_COLUMNS)
    .in('id', merged.map(i => i.product_id))

  if (error) {
    console.error('[chat] could not price the cart:', error)
    throw createError({ statusCode: 502, statusMessage: 'Could not read the cart right now.' })
  }

  const lines = merged
    .map(item => {
      const product = data?.find(p => p.id === item.product_id)
      return product
        ? { product: { ...product, price_cents: salePriceCents(product.price_cents, sale) }, quantity: item.quantity }
        : null
    })
    .filter((line): line is NonNullable<typeof line> => line !== null)

  return {
    lines,
    subtotalCents: lines
      .filter(l => l.product.in_stock)
      .reduce((sum, l) => sum + l.product.price_cents * l.quantity, 0)
  }
}

async function findBySlug(slug: string) {
  const { data, error } = await useSupabase()
    .from('products')
    .select(CATALOGUE_COLUMNS)
    .eq('slug', slug)
    .maybeSingle()

  if (error) {
    console.error('[chat] could not read the catalogue:', error)
    throw createError({ statusCode: 502, statusMessage: 'Could not read the catalogue right now.' })
  }
  return data ? withProductKind(data) : null
}

/**
 * What a tool hands back. Declared, not derived.
 *
 * The first version of this took `Awaited<ReturnType<typeof runTool>>` and
 * pulled each branch out with `Extract`, on the reasoning that a derived type
 * cannot drift. It drifts in the worse direction: rename a field inside the
 * switch and `Extract` matches nothing, so the branch type quietly becomes
 * `never`, every test that reads it still compiles, and the check that was
 * supposed to catch the rename is the thing that hid it. Verified by renaming
 * `subtotal` to `total` and watching the typecheck stay green.
 *
 * Declared here and annotated on `runTool` instead, so the same rename fails at
 * the return statement that made it.
 */

/** What the model is shown about one item. No ids: it names items by slug. */
export interface PresentedItem {
  slug: string
  name: string
  description: string | null
  price: string
  /** Only while a sale is active. */
  originalPrice?: string
  salePercent?: number
  kind: 'physical' | 'digital'
  available: boolean
  /** Files only. */
  file?: string | null
  format?: string | null
  delivery?: string
}

/** The branch every tool can return: a sentence for the model to read out. */
export interface ToolError {
  error: string
}

/** `search_catalogue`. */
export interface SearchResult {
  items: PresentedItem[]
}

/** `get_product` returns the item itself. */
export type ProductResult = PresentedItem

/** `get_cart`: the cart as the model is shown it, priced by the shop. */
export interface CartResult {
  lines: Array<{
    name: string
    slug: string
    quantity: number
    amount: string
    available: boolean
  }>
  subtotal: string
}

/** `propose_cart_change`: what the browser is being asked to apply. */
export interface CartChangeResult {
  applied: 'add' | 'remove' | 'set'
  item: string
  quantity: number
  /** Present only when the request was trimmed, so the model can say why. */
  note?: string
}

/** `draft_order`: the acknowledgement. The draft itself goes on the context. */
export interface DraftResult {
  drafted: true
  note: string
}

export type ToolResult =
  | ToolError
  | SearchResult
  | ProductResult
  | CartResult
  | CartChangeResult
  | DraftResult

/**
 * Runs one tool call. Every result is a string handed back to the model, so a
 * failure here reads as "I could not do that" rather than throwing the
 * conversation away.
 */
export async function runTool(
  name: string,
  rawArgs: string,
  context: ToolContext
): Promise<ToolResult> {
  let args: unknown
  try {
    args = JSON.parse(rawArgs || '{}')
  } catch {
    return { error: 'Those arguments were not valid.' }
  }

  switch (name) {
    case 'search_catalogue': {
      const parsed = searchCatalogueArgs.safeParse(args)
      if (!parsed.success) return { error: 'Invalid arguments.' }

      let query = useSupabase().from('products').select(CATALOGUE_COLUMNS)
      if (parsed.data.kind) query = query.eq('kind', parsed.data.kind)

      const [{ data, error }, sale] = await Promise.all([
        query.order('created_at', { ascending: true }),
        getSaleState()
      ])
      if (error) {
        console.error('[chat] could not search the catalogue:', error)
        return { error: 'The catalogue could not be read.' }
      }

      // The same rule the storefront's own search field uses, so the assistant
      // and the shop page cannot answer differently for the same words.
      const term = normalizeSearchTerm(parsed.data.query)
      const matched = term ? data.filter(p => matchesSearch(p, term)) : data

      // A term that matches nothing still gets the catalogue, so the assistant
      // can say what the shop does have instead of only what it does not.
      return { items: (matched.length ? matched : data).map(p => present(withProductKind(p), sale)) }
    }

    case 'get_product': {
      const parsed = getProductArgs.safeParse(args)
      if (!parsed.success) return { error: 'Invalid arguments.' }

      const [product, sale] = await Promise.all([findBySlug(parsed.data.slug), getSaleState()])
      return product ? present(product, sale) : { error: 'The shop does not have that item.' }
    }

    case 'get_cart': {
      const { lines, subtotalCents } = await priceCart(context.items, await getSaleState())
      return {
        lines: lines.map(l => ({
          name: l.product.name,
          slug: l.product.slug,
          quantity: l.quantity,
          amount: `$${((l.product.price_cents * l.quantity) / 100).toFixed(2)}`,
          available: l.product.kind === 'digital' ? true : l.product.in_stock
        })),
        subtotal: `$${(subtotalCents / 100).toFixed(2)}`
      }
    }

    case 'propose_cart_change': {
      const parsed = proposeCartChangeArgs.safeParse(args)
      if (!parsed.success) return { error: 'Invalid arguments.' }

      // The id is resolved here, so an item the model invented never reaches
      // the browser as an intent.
      const product = await findBySlug(parsed.data.slug)
      if (!product) return { error: 'The shop does not have that item.' }
      if (product.kind !== 'digital' && !product.in_stock) {
        return { error: `${product.name} is out of stock.` }
      }

      const single = product.kind === 'digital'
      const requested = parsed.data.quantity ?? 1
      const quantity =
        parsed.data.action === 'remove' ? 0 : single ? 1 : Math.min(Math.max(requested, 1), 99)

      context.intents.push({
        action: parsed.data.action,
        productId: product.id,
        quantity,
        name: product.name,
        single
      })

      return {
        applied: parsed.data.action,
        item: product.name,
        quantity,
        note: single && requested > 1 ? 'A file can only be ordered once.' : undefined
      }
    }

    case 'draft_order': {
      const parsed = draftOrderArgs.safeParse(args)
      if (!parsed.success) return { error: 'A name and a valid email address are needed.' }

      const { lines, subtotalCents } = await priceCart(context.items, await getSaleState())
      if (!lines.length) return { error: 'The cart is empty, so there is nothing to order.' }

      const unavailable = lines.filter(l => l.product.kind !== 'digital' && !l.product.in_stock)
      if (unavailable.length) {
        return {
          error: `${unavailable.map(l => l.product.name).join(', ')} cannot be ordered right now and must be removed first.`
        }
      }

      context.draft = {
        customer: parsed.data,
        lines: lines.map(l => ({
          name: l.product.name,
          quantity: l.quantity,
          amountCents: l.product.price_cents * l.quantity
        })),
        totalCents: subtotalCents
      }

      // Deliberately no confirmation in this result: it goes to the browser
      // beside the reply, never into the message history the provider sees.
      return {
        drafted: true,
        note: 'The draft is shown to the visitor. Only they can confirm it. Tell them to review and confirm; do not say the order is placed.'
      }
    }

    default:
      return { error: 'Unknown tool.' }
  }
}
