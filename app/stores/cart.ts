import { defineStore } from 'pinia'

interface StoredLine {
  productId: string
  quantity: number
}

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
    add(productId: string, quantity = 1) {
      const existing = this.items.find(i => i.productId === productId)
      if (existing) existing.quantity = Math.min(existing.quantity + quantity, 99)
      else this.items.push({ productId, quantity })
    },

    setQuantity(productId: string, quantity: number) {
      if (quantity <= 0) return this.remove(productId)
      const existing = this.items.find(i => i.productId === productId)
      if (existing) existing.quantity = Math.min(quantity, 99)
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
