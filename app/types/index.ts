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
  missing: string[]
}
