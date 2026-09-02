import { defineStore } from 'pinia'
import type { CartIntent, ChatMessage, ChatResponse, OrderDraft } from '~/types'

/** Matches the cap the chat route enforces, so the drawer can say so first. */
const MAX_MESSAGES = 25

/**
 * The conversation, for as long as the visitor is having it. Nothing here is
 * persisted: no `persist` option, so a reload starts fresh, which is what the
 * no-stored-conversations decision means in the browser.
 *
 * The draft's confirmation lives here beside the draft and never goes back to
 * the chat route: `messages` is the only thing sent, and it holds role and
 * content alone.
 */
export const useAssistantStore = defineStore('assistant', {
  state: () => ({
    open: false,
    available: true,
    pending: false,
    ended: false,
    error: '' as string,
    messages: [] as ChatMessage[],
    draft: null as OrderDraft | null
  }),

  getters: {
    isEmpty: state => state.messages.length === 0,
    remaining: state => MAX_MESSAGES - state.messages.length
  },

  actions: {
    async openDrawer() {
      this.open = true
      // Cheap, and the answer can change between deploys, so ask each time the
      // drawer opens rather than trusting a value from page load.
      try {
        const { available } = await $fetch<{ available: boolean }>('/api/chat')
        this.available = available
      } catch {
        this.available = false
      }
    },

    close() {
      this.open = false
    },

    /** Closing does not clear; starting again does. */
    reset() {
      this.messages = []
      this.draft = null
      this.error = ''
      this.ended = false
    },

    dismissDraft() {
      this.draft = null
    },

    async send(text: string, cartItems: Array<{ productId: string; quantity: number }>) {
      const content = text.trim()
      if (!content || this.pending || this.ended) return

      // The reply is a message too, so stop one short of the cap rather than
      // sending a turn the server will refuse.
      if (this.messages.length + 2 > MAX_MESSAGES) {
        this.ended = true
        return
      }

      this.error = ''
      this.messages.push({ role: 'user', content })
      this.pending = true

      try {
        const response = await $fetch<ChatResponse>('/api/chat', {
          method: 'POST',
          body: {
            messages: this.messages,
            ...(cartItems.length ? { items: cartItems } : {})
          }
        })

        this.messages.push({ role: 'assistant', content: response.reply })
        if (response.draft) this.draft = response.draft
        return response.intents
      } catch (error: any) {
        // The route already writes visitor-facing text into statusMessage, and
        // logs anything internal on the server.
        this.error = error?.statusMessage ?? 'The assistant is unavailable right now.'
        if (error?.statusCode === 400 || error?.statusCode === 429) this.ended = true
        this.messages.pop()
      } finally {
        this.pending = false
      }
    }
  }
})
