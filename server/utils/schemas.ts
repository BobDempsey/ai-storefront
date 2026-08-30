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
    notes: z.string().trim().max(2000).optional().default('')
  }),
  items: cartItemsSchema
})

/** Collapse duplicate lines so quantities are summed rather than rejected. */
export function mergeItems(items: z.infer<typeof cartItemsSchema>) {
  const merged = new Map<string, number>()
  for (const item of items) {
    merged.set(item.productId, (merged.get(item.productId) ?? 0) + item.quantity)
  }
  return [...merged].map(([product_id, quantity]) => ({ product_id, quantity }))
}
