import { errorStatus, messageFor } from '~/utils/errors'
import { defineStore } from 'pinia'
import type { ChatMessage, ChatResponse, OrderDraft } from '~/types'

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
    /**
     * Whether the navbar shows the attention dot. True until the visitor opens
     * the panel, and nothing stores it: the store is rebuilt on every page
     * load, so a refresh brings the dot back. Navigating inside the app does
     * not, because that does not rebuild the store.
     */
    showDot: true,
    /**
     * A question a page wants waiting in the message box, set by whoever calls
     * `openDrawer()`. It is a handover rather than a value: the drawer takes it
     * on open and calls `takePrefill()`, so a later open from the navbar does
     * not bring back the last product's question. The drawer decides whether to
     * use it; a half-typed message or a conversation in progress wins over it.
     */
    prefill: '',
    available: true,
    pending: false,
    ended: false,
    error: '',
    messages: [] as ChatMessage[],
    draft: null as OrderDraft | null
  }),

  getters: {
    isEmpty: state => state.messages.length === 0,
    remaining: state => MAX_MESSAGES - state.messages.length
  },

  actions: {
    /**
     * `prefill` is optional and only ever set, never cleared, by opening: an
     * open from a control that has no question to offer leaves whatever is
     * already waiting alone, since clearing it here would race the drawer
     * reading it.
     */
    async openDrawer(prefill?: string) {
      if (prefill) this.prefill = prefill
      this.open = true
      this.showDot = false
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

    /** The drawer takes the pending question, leaving nothing behind it. */
    takePrefill() {
      this.prefill = ''
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
      } catch (error: unknown) {
        // The route already writes visitor-facing text into statusMessage, and
        // logs anything internal on the server.
        this.error = messageFor(error, 'The assistant is unavailable right now.')
        const status = errorStatus(error)
        if (status === 400 || status === 429) this.ended = true
        this.messages.pop()
      } finally {
        this.pending = false
      }
    }
  }
})
