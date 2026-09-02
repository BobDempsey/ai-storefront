interface CatalogItem {
  id: string
  slug: string
  name: string
  description: string | null
  price_cents: number
  image_url: string | null
  in_stock: boolean
}

/** A printed object. Carries no file fields at all. */
export interface PhysicalProduct extends CatalogItem {
  kind: 'physical'
  file_name: null
  file_format: null
  file_size_bytes: null
}

/** A file the shop emails after payment. Its three file facts are always set. */
export interface DigitalProduct extends CatalogItem {
  kind: 'digital'
  file_name: string
  file_format: string
  file_size_bytes: number
}

/**
 * The union is what forces the check: reading `file_name` off a `Product`
 * without narrowing on `kind` first does not type.
 */
export type Product = PhysicalProduct | DigitalProduct

// Spelled out per member: Omit over a union collapses it to the shared keys and
// loses the discriminant, which is the one thing this type is for.
export type CartLine =
  | (Omit<PhysicalProduct, 'description'> & { quantity: number })
  | (Omit<DigitalProduct, 'description'> & { quantity: number })

export interface CartPreview {
  lines: CartLine[]
  subtotalCents: number
  /** Ids the browser still holds whose product has left the catalogue. */
  missing: string[]
}

/**
 * What POST /api/orders returns. `totalCents` is absent when the committed
 * order could not be read back. Never assume a total, and never default it.
 */
export interface OrderResponse {
  orderId: string
  totalCents?: number
}

/** Body of the 409 returned when an order contains an unavailable product. */
export interface OrderConflictData {
  unavailableProductIds: string[]
}

// --- assistant ------------------------------------------------------------

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

/** A cart change the assistant proposed. The storefront applies it. */
export interface CartIntent {
  action: 'add' | 'remove' | 'set'
  productId: string
  quantity: number
  name: string
  /** True for a file, which the cart holds only one of. */
  single: boolean
}

export interface OrderDraft {
  customer: { name: string; email: string; phone?: string; notes?: string }
  lines: Array<{ name: string; quantity: number; amountCents: number }>
  totalCents: number
  /**
   * Issued by the server beside the draft and never shown to the model. It is
   * spent when the visitor confirms, and it is not part of the conversation.
   */
  confirmation: string
}

export interface ChatResponse {
  reply: string
  intents: CartIntent[]
  draft: OrderDraft | null
}
