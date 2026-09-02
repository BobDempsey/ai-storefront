import { defineStore } from 'pinia'

interface StoredLine {
  productId: string
  quantity: number
}

/**
 * A file is emailed once, so a second copy delivers nothing. The cart never
 * holds more than one of a line added this way; the catalogue kind is not in
 * the cart, so the caller says which lines are capped.
 */
const FILE_QUANTITY = 1

/**
 * Holds IDs and quantities only, never prices. Totals are always resolved
 * server-side, so a tampered cart cookie cannot change what is ordered.
 */
export const useCartStore = defineStore('cart', {
  state: () => ({
    items: [] as StoredLine[]
  }),

  getters: {
    count: state => state.items.reduce((sum, i) => sum + i.quantity, 0),
    isEmpty: state => state.items.length === 0,
    quantityOf: state => (productId: string) =>
      state.items.find(i => i.productId === productId)?.quantity ?? 0
  },

  actions: {
    add(productId: string, quantity = 1, options: { single?: boolean } = {}) {
      const max = options.single ? FILE_QUANTITY : 99
      const existing = this.items.find(i => i.productId === productId)
      if (existing) existing.quantity = Math.min(existing.quantity + quantity, max)
      else this.items.push({ productId, quantity: Math.min(quantity, max) })
    },

    setQuantity(productId: string, quantity: number, options: { single?: boolean } = {}) {
      if (quantity <= 0) return this.remove(productId)
      const existing = this.items.find(i => i.productId === productId)
      if (existing) existing.quantity = Math.min(quantity, options.single ? FILE_QUANTITY : 99)
    },

    remove(productId: string) {
      this.items = this.items.filter(i => i.productId !== productId)
    },

    clear() {
      this.items = []
    }
  },

  persist: true
})
