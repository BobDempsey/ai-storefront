import { z } from 'zod'

export const cartItemsSchema = z
  .array(
    z.object({
      productId: z.string().uuid(),
      quantity: z.number().int().min(1).max(99)
    })
  )
  .min(1)
  .max(50)

export const orderSchema = z.object({
  customer: z.object({
    name: z.string().trim().min(1).max(120),
    email: z.string().trim().email().max(200),
    phone: z.string().trim().max(40).optional().default(''),
    notes: z.string().trim().max(500).optional().default('')
  }),
  items: cartItemsSchema,
  // Present only on a submission from an assistant draft. The checkout page
  // sends none, and always has.
  confirmation: z.string().uuid().optional(),
  // What the buyer typed into the promo field. Only ever a code: the browser
  // never sends a percentage or a total, and create_order resolves this again
  // before it prices anything.
  promoCode: z.string().trim().max(60).optional(),
  // Ticked the newsletter box on the checkout form.
  subscribe: z.boolean().optional().default(false)
})

/** Body of the checkout's cart preview: the cart, plus what the buyer has
 *  typed into the promo field and the email it would be redeemed against. */
export const cartPreviewSchema = z.object({
  items: cartItemsSchema,
  promoCode: z.string().trim().max(60).optional(),
  email: z.string().trim().max(200).optional()
})

/** Collapse duplicate lines so quantities are summed rather than rejected. */
export function mergeItems(items: z.infer<typeof cartItemsSchema>) {
  const merged = new Map<string, number>()
  for (const item of items) {
    merged.set(item.productId, (merged.get(item.productId) ?? 0) + item.quantity)
  }
  return [...merged].map(([product_id, quantity]) => ({ product_id, quantity }))
}

export const contactSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  message: z.string().trim().min(1).max(4000),
  // Ticked the newsletter box on the contact form. Off unless the sender
  // turns it on, and it never changes how the message itself is handled.
  subscribe: z.boolean().optional().default(false)
})

export const emailOptinSchema = z.object({
  email: z.string().trim().email().max(200)
})

// --- assistant ------------------------------------------------------------

/** One turn of a conversation. The browser holds the history and sends it back. */
export const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1).max(2000)
})

/** A conversation is capped at 25 messages, so the array is capped with it. */
export const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(25),
  // The cart travels with the request the same way it travels to the order and
  // preview routes: ids and quantities the browser holds, never prices.
  items: cartItemsSchema.optional()
})

/**
 * Tool arguments, validated before a handler runs. The model names an item by
 * slug and never handles a product id, so an id it invented cannot reach the
 * catalogue.
 */
export const searchCatalogueArgs = z.object({
  query: z.string().trim().max(200).optional(),
  kind: z.enum(['physical', 'digital']).optional()
})

/** The `q` on a catalogue request: what the visitor typed into the search
 *  field. Capped rather than unbounded, since it reaches an ilike pattern, and
 *  optional because an unfiltered catalogue is the ordinary case. */
export const catalogueQuerySchema = z.object({
  q: z.string().trim().max(200).optional()
})

export const getProductArgs = z.object({
  slug: z.string().trim().min(1).max(120)
})

export const proposeCartChangeArgs = z.object({
  action: z.enum(['add', 'remove', 'set']),
  slug: z.string().trim().min(1).max(120),
  quantity: z.number().int().min(0).max(99).optional()
})

export const draftOrderArgs = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(40).optional(),
  notes: z.string().trim().max(2000).optional()
})
