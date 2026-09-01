export interface Product {
  id: string
  slug: string
  name: string
  description: string | null
  price_cents: number
  image_url: string | null
  in_stock: boolean
}

export interface CartLine extends Omit<Product, 'description'> {
  quantity: number
}

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
