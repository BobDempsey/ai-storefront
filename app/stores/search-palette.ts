import { defineStore } from 'pinia'

/**
 * Whether the quick search panel is open.
 *
 * A store rather than a prop, for the same reason the assistant drawer has one:
 * the control that opens it lives in the layout's header and the panel itself
 * is rendered once beside it, and a page may want to open it too without
 * threading an event through the layout.
 *
 * Nothing here is persisted. A panel that reopened itself on the next page load
 * would be a panel the visitor did not ask for.
 */
export const useSearchPaletteStore = defineStore('search-palette', {
  state: () => ({ open: false }),
  actions: {
    openPalette() {
      this.open = true
    },
    close() {
      this.open = false
    },
    toggle() {
      this.open = !this.open
    }
  }
})
