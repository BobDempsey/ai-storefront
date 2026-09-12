/**
 * The shapes the API answers with, declared once for both sides.
 *
 * These lived in `app/types/index.ts`, where only the browser could see them, so
 * a route's return type was checked against nothing and the two could drift: the
 * pagination work declared `CataloguePage` twice in one change, once in
 * `index.vue` and once in `SearchPalette.vue`. Nuxt 4's `shared/` is visible to
 * `app/` and `server/` alike, so the route that produces a shape and the code
 * that reads it now name the same type. `app/types/index.ts` re-exports all of
 * it, which is why no app import had to change.
 */

interface CatalogItem {
  id: string
  slug: string
  name: string
  description: string | null
  /** Already discounted when a sale is active; the price to show and to sum. */
  price_cents: number
  /** Set only while a sale is active, so a plain price never carries these. */
  originalPriceCents?: number
  salePercent: number
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

/**
 * One page of the catalogue, the answer to GET /api/products. `total` is the
 * whole number matched, not the number on the page: the tab counts and the
 * paging controls both read it.
 */
export interface CataloguePage<T = Product> {
  items: T[]
  total: number
  page: number
  perPage: number
}

/** Response of GET /api/chat: whether the assistant is configured at all. */
export interface ChatAvailability {
  available: boolean
}

/** Response of POST /api/contact. Nothing is stored, so this is the receipt. */
export interface ContactResponse {
  sent: true
}

/** Response of POST /api/email-optin. The same for a new and a known address. */
export interface EmailOptinResponse {
  subscribed: true
}

/** Response of GET /api/store-settings. */
export interface StoreSettings {
  saleActive: boolean
  salePercent: number
  /**
   * The active promo code's discount, for copy that offers it. Zero when no
   * code is active. The code itself is never sent to the browser.
   */
  promoPercent: number
}

/** Why a promo code was or was not applied. Mirrors create_order's errors. */
export type PromoStatus = 'applied' | 'unknown' | 'inactive' | 'used'

export interface CartPreview {
  lines: CartLine[]
  subtotalCents: number
  /** Ids the browser still holds whose product has left the catalogue. */
  missing: string[]
  /** Absent unless a code was sent with the request. */
  promoStatus?: PromoStatus
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

/** Body of the 400 returned when a promo code cannot be used. */
export interface OrderPromoErrorData {
  promoStatus: 'unknown_promo_code' | 'inactive_promo_code' | 'promo_code_used'
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

/**
 * A draft as the assistant's tools build it, which is everything about the
 * order except the one thing the model is never given. `chat.post.ts` mints the
 * confirmation onto this on its way out, so this is the shape that exists
 * inside the tool loop and nowhere else.
 */
export interface DraftOrder {
  customer: { name: string; email: string; phone?: string; notes?: string }
  lines: Array<{ name: string; quantity: number; amountCents: number }>
  totalCents: number
}

/** The same draft as the browser receives it. */
export interface OrderDraft extends DraftOrder {
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
