<script setup lang="ts">
import type { CartIntent, CartPreview, OrderResponse } from '~/types'
import { formatMoney } from '~/utils/money'

const assistant = useAssistantStore()
const cart = useCartStore()

const input = ref('')
const submitting = ref(false)
const orderId = ref('')
const draftError = ref('')

// The draft's own details, editable before confirming. Copied out of the draft
// so an edit is the visitor's, not something the assistant typed.
const details = reactive({ name: '', email: '', phone: '', notes: '' })

watch(
  () => assistant.draft,
  draft => {
    if (!draft) return
    Object.assign(details, {
      name: draft.customer.name,
      email: draft.customer.email,
      phone: draft.customer.phone ?? '',
      notes: draft.customer.notes ?? ''
    })
    draftError.value = ''
  }
)

/**
 * Applies what the assistant proposed through the ordinary cart store, so the
 * file cap, the quantity ceiling and the persisted cookie all still apply.
 */
function applyIntents(intents: CartIntent[] = []) {
  for (const intent of intents) {
    if (intent.action === 'remove') cart.remove(intent.productId)
    else if (intent.action === 'set') {
      cart.setQuantity(intent.productId, intent.quantity, { single: intent.single })
    } else cart.add(intent.productId, intent.quantity, { single: intent.single })
  }
}

async function send() {
  const text = input.value
  input.value = ''
  const intents = await assistant.send(text, cart.items)
  applyIntents(intents)
}

async function confirmDraft() {
  if (!assistant.draft || submitting.value) return

  submitting.value = true
  draftError.value = ''

  try {
    const { orderId: id } = await $fetch<OrderResponse>('/api/orders', {
      method: 'POST',
      body: {
        customer: { ...details },
        items: cart.items,
        // The one value the assistant never held.
        confirmation: assistant.draft.confirmation
      }
    })
    orderId.value = id
    assistant.dismissDraft()
    cart.clear()
  } catch (error: any) {
    draftError.value = error?.statusMessage ?? 'The order could not be submitted. Please try again.'
  } finally {
    submitting.value = false
  }
}

function startAgain() {
  assistant.reset()
  orderId.value = ''
  draftError.value = ''
}

/**
 * The cart strip at the top of the drawer. Priced by the same endpoint the cart
 * page uses, so the figure here and the figure there cannot disagree, and
 * neither is anything the model typed.
 */
const preview = ref<CartPreview | null>(null)

async function refreshCart() {
  if (cart.isEmpty) {
    preview.value = null
    return
  }
  try {
    preview.value = await $fetch<CartPreview>('/api/cart/preview', {
      method: 'POST',
      body: { items: cart.items }
    })
  } catch {
    preview.value = null
  }
}

watch(() => [assistant.open, cart.items] as const, ([open]) => {
  if (open) refreshCart()
}, { deep: true, immediate: true })
</script>

<template>
  <Drawer
    :visible="assistant.open"
    position="right"
    class="w-full sm:!w-[28rem]"
    header="Shop assistant"
    @update:visible="assistant.close()"
  >
    <div class="flex h-full flex-col gap-4">
      <Message v-if="!assistant.available" severity="warn">
        The assistant is unavailable right now. Everything else on the shop still works.
      </Message>

      <template v-else>
        <div class="flex-1 space-y-3 overflow-y-auto">
          <div
            v-if="preview?.lines.length"
            class="rounded-lg border border-surface-200 px-3 py-2 text-xs dark:border-surface-800"
          >
            <p class="mb-1 font-medium">In your cart</p>
            <p v-for="line in preview.lines" :key="line.id" class="flex justify-between gap-4 text-surface-500">
              <span>{{ line.name }} &times; {{ line.quantity }}</span>
              <span>{{ formatMoney(line.price_cents * line.quantity) }}</span>
            </p>
            <p class="mt-1 flex justify-between gap-4 font-medium">
              <span>Subtotal</span>
              <span>{{ formatMoney(preview.subtotalCents) }}</span>
            </p>
          </div>

          <p v-if="assistant.isEmpty" class="text-sm text-surface-500">
            Ask about anything in the shop: what a print is made of, what is in your
            cart, or how ordering works. I can add things for you and draft an order,
            but you confirm it yourself.
          </p>

          <div
            v-for="(message, index) in assistant.messages"
            :key="index"
            class="max-w-[90%] rounded-lg px-3 py-2 text-sm"
            :class="message.role === 'user'
              ? 'ml-auto bg-surface-200 dark:bg-surface-700'
              : 'bg-surface-100 dark:bg-surface-800'"
          >
            {{ message.content }}
          </div>

          <p v-if="assistant.pending" class="text-sm text-surface-500">Thinking...</p>

          <!-- The draft: the shop's lines and the shop's total, with the
               details editable before anything is submitted. -->
          <div
            v-if="assistant.draft"
            class="rounded-lg border border-surface-300 bg-surface-0 p-4 dark:border-surface-700 dark:bg-surface-900"
          >
            <p class="mb-3 font-medium">Review your order</p>

            <ul class="mb-3 space-y-1 text-sm">
              <li
                v-for="line in assistant.draft.lines"
                :key="line.name"
                class="flex justify-between gap-4"
              >
                <span>{{ line.name }} &times; {{ line.quantity }}</span>
                <span>{{ formatMoney(line.amountCents) }}</span>
              </li>
            </ul>

            <p class="mb-3 flex justify-between border-t border-surface-200 pt-2 text-sm font-medium dark:border-surface-800">
              <span>Total</span>
              <span>{{ formatMoney(assistant.draft.totalCents) }}</span>
            </p>

            <div class="flex flex-col gap-2">
              <InputText v-model="details.name" placeholder="Name" size="small" />
              <InputText v-model="details.email" placeholder="Email" size="small" />
              <InputText v-model="details.phone" placeholder="Phone (optional)" size="small" />
              <Textarea v-model="details.notes" placeholder="Notes (optional)" rows="2" auto-resize />
            </div>

            <Message v-if="draftError" severity="error" class="mt-3">{{ draftError }}</Message>

            <div class="mt-3 flex gap-2">
              <Button
                label="Confirm order"
                size="small"
                :loading="submitting"
                @click="confirmDraft"
              />
              <Button
                label="Cancel"
                size="small"
                severity="secondary"
                outlined
                @click="assistant.dismissDraft()"
              />
            </div>
          </div>

          <Message v-if="orderId" severity="success">
            Order received. Reference <code>{{ orderId }}</code>. We will email you to
            confirm and arrange payment.
          </Message>

          <Message v-if="assistant.error" severity="error">{{ assistant.error }}</Message>
        </div>

        <div v-if="assistant.ended" class="border-t border-surface-200 pt-4 dark:border-surface-800">
          <p class="mb-2 text-sm text-surface-500">
            This conversation has ended. The rest of the shop still works.
          </p>
          <Button label="Start a new one" size="small" outlined @click="startAgain" />
        </div>

        <form
          v-else
          class="flex gap-2 border-t border-surface-200 pt-4 dark:border-surface-800"
          @submit.prevent="send"
        >
          <InputText
            v-model="input"
            class="flex-1"
            placeholder="Ask about the shop"
            aria-label="Message the shop assistant"
            :disabled="assistant.pending"
          />
          <Button
            type="submit"
            icon="pi pi-send"
            aria-label="Send"
            :disabled="assistant.pending || !input.trim()"
          />
        </form>
      </template>
    </div>
  </Drawer>
</template>
