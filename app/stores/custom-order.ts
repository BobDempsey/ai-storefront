import { defineStore } from 'pinia'

/**
 * The term a visitor searched for and the catalogue could not answer, on its
 * way to the contact form.
 *
 * A store rather than a query parameter, for the same reason the assistant's
 * `prefill` is one. `/contact?q=custom%20dragon` is an address the visitor can
 * share and the browser will replay: a reload would refill a box they had
 * already cleared, and a link they pasted to a friend would carry what they had
 * been shopping for. Nothing here is persisted, so a reload starts empty.
 *
 * It carries no price, no product and no promise. The visitor asks; staff
 * answer by email.
 */
export const useCustomOrderStore = defineStore('custom-order', {
  state: () => ({
    /**
     * Set by whoever sends the visitor to the contact form, and taken once by
     * that form. Taking it is what stops a visitor who asked about one search,
     * then came back to the form later with a question about an order, finding
     * the old term waiting in the box.
     */
    term: ''
  }),

  actions: {
    /** Hands the term over and sends nothing: the visitor still presses send. */
    askFor(term: string) {
      this.term = term.trim()
    },

    /** The form takes the term, leaving nothing behind it. */
    takeTerm() {
      const term = this.term
      this.term = ''
      return term
    }
  }
})
