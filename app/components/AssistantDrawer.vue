<script setup lang="ts">
import { errorData, messageFor } from '~/utils/errors'
import type { CartIntent, CartPreview, OrderPromoErrorData, OrderResponse } from '~/types'
import { formatMoney } from '~/utils/money'

const assistant = useAssistantStore()
const cart = useCartStore()

const input = ref('')
const messageBox = ref<{ $el: HTMLInputElement } | null>(null)

/**
 * What the panel says while it waits. A reply takes six to eight seconds even
 * at the reasoning effort the route now asks for (see REASONING_EFFORT in
 * server/api/chat.post.ts), and nothing streams, so the wait is a blank panel
 * unless something fills it.
 *
 * The wording changes once, three seconds in. A label that never moves stops
 * being read after the first second and starts looking like a page that has
 * hung; one that changes says the wait is being counted by something. Three
 * seconds because that is roughly where a wait stops feeling instant, and
 * still inside the six it will actually take.
 */
const PATIENCE_MS = 3000
const waitedAWhile = ref(false)
const waitingLabel = computed(() => (waitedAWhile.value ? 'Almost there' : 'Thinking'))

watch(
  () => assistant.pending,
  pending => {
    // Cleared on both edges, so the next question starts at "Thinking" rather
    // than inheriting the end of the last one.
    if (patienceTimer) clearTimeout(patienceTimer)
    waitedAWhile.value = false
    if (!pending) return
    patienceTimer = setTimeout(() => {
      waitedAWhile.value = true
    }, PATIENCE_MS)
  }
)

let patienceTimer: ReturnType<typeof setTimeout> | undefined

onUnmounted(() => {
  if (patienceTimer) clearTimeout(patienceTimer)
})
const submitting = ref(false)
const orderId = ref('')
const draftError = ref('')

// The draft's own details, editable before confirming. Copied out of the draft
// so an edit is the visitor's, not something the assistant typed.
const details = reactive({ name: '', email: '', phone: '', notes: '' })

/**
 * A product page can open the panel with a question about that product already
 * written. Two things have to be true before it lands: there has to be a
 * question waiting, and the box has to be empty. A half-typed message is the
 * visitor's, so it wins.
 *
 * A conversation in progress does not block it, though an earlier version of
 * this guard said it did. Reading one product, asking about it, then moving to
 * another and asking about that one is the ordinary way to use the button, and
 * under the old rule the second click opened a panel with an empty box and no
 * explanation, which reads as broken rather than as careful.
 *
 * Taking it on open rather than on close is what stops a visitor who opens from
 * one product, closes, and reopens from the navbar getting the first product's
 * question back.
 *
 * Nothing is sent. The text sits in the box under the greeting with the cursor
 * at the end of it, so the next keystroke either edits it or sends it, and the
 * click costs no provider call.
 */
watch(
  () => assistant.open,
  async open => {
    if (!open || !assistant.prefill) return
    if (input.value) return

    input.value = assistant.prefill
    assistant.takePrefill()

    await nextTick()
    const field = messageBox.value?.$el
    if (!field) return
    field.focus()
    field.setSelectionRange(field.value.length, field.value.length)
  }
)

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
    clearPromo()
  }
)

/**
 * The promo code, typed here by the visitor rather than said to the assistant.
 *
 * This field is the whole reason the assistant can offer a discount without
 * being able to produce one. The value lives in the browser and goes to the
 * server on the same two requests the checkout page makes. It is never sent to
 * the chat route, never becomes a tool argument, and never enters the message
 * history the provider sees, so there is no code for a talked-around model to
 * apply, invent or check.
 */
const promoCode = ref('')
/** The code the draft was last priced with. Typing alone changes nothing. */
const appliedCode = ref('')
const applying = ref(false)
const promoPreview = ref<CartPreview | null>(null)

function clearPromo() {
  promoCode.value = ''
  appliedCode.value = ''
  promoPreview.value = null
}

const promoStatus = computed(() => promoPreview.value?.promoStatus)
const promoPercent = computed(() => promoPreview.value?.lines[0]?.salePercent ?? 0)

/**
 * The card's figures: the code's prices once applied, the draft's otherwise.
 *
 * The lines move with the total deliberately. Showing the draft's sale-priced
 * lines under a code-priced total gives a card whose numbers do not add up,
 * which is what the first version of this did.
 */
const codeApplied = computed(() => promoStatus.value === 'applied')

const draftLines = computed(() =>
  codeApplied.value
    ? promoPreview.value!.lines.map(line => ({
        name: line.name,
        quantity: line.quantity,
        amountCents: line.price_cents * line.quantity
      }))
    : (assistant.draft?.lines ?? [])
)

const draftTotalCents = computed(() =>
  codeApplied.value
    ? promoPreview.value!.subtotalCents
    : (assistant.draft?.totalCents ?? 0)
)

// The same four messages the checkout page shows, in the same words: a buyer
// who typed a code is owed the reason it failed, so they can fix it.
const promoMessage = computed(() => {
  switch (promoStatus.value) {
    case 'applied':
      return { severity: 'success' as const, text: `Code applied. ${promoPercent.value}% off.` }
    case 'unknown':
      return { severity: 'error' as const, text: "That promo code isn't recognised." }
    case 'inactive':
      return { severity: 'error' as const, text: 'That promo code is no longer valid.' }
    case 'used':
      return { severity: 'error' as const, text: 'That promo code has already been used.' }
    default:
      return null
  }
})

/**
 * Re-prices the draft with the typed code, through the endpoint the checkout
 * page uses, so the two cannot price one code differently.
 */
async function applyPromoCode() {
  const code = promoCode.value.trim()
  if (!code) {
    clearPromo()
    return
  }

  applying.value = true
  appliedCode.value = code
  try {
    promoPreview.value = await $fetch<CartPreview>('/api/cart/preview', {
      method: 'POST',
      body: { items: cart.items, promoCode: code, email: details.email || undefined }
    })
    // A rejected code must not sit in the field. Leaving it there means the
    // next Confirm resends it and the order 400s on a code already refused,
    // which is the bug 6c70104 fixed on the checkout page.
    if (promoStatus.value !== 'applied') {
      promoCode.value = ''
      appliedCode.value = ''
    }
  } catch {
    clearPromo()
    draftError.value = 'The promo code could not be checked. Please try again.'
  } finally {
    applying.value = false
  }
}

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
        // Both values the assistant never held: the confirmation the server
        // minted beside the draft, and the code the visitor typed into the
        // field. create_order resolves the code again and prices the order.
        confirmation: assistant.draft.confirmation,
        promoCode: appliedCode.value || undefined
      }
    })
    orderId.value = id
    assistant.dismissDraft()
    cart.clear()
    clearPromo()
  } catch (error: unknown) {
    draftError.value = messageFor(error, 'The order could not be submitted. Please try again.')
    // A code create_order refused at submit is dropped, not left on the draft:
    // Confirm again would resend it and fail the same way. The visitor can
    // place the order without it, or type a different one.
    if (errorData<OrderPromoErrorData>(error)?.promoStatus) clearPromo()
  } finally {
    submitting.value = false
  }
}

function startAgain() {
  assistant.reset()
  orderId.value = ''
  draftError.value = ''
  clearPromo()
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
  if (open) void refreshCart()
}, { deep: true, immediate: true })
</script>

<template>
  <Drawer
    :visible="assistant.open"
    position="right"
    class="w-full sm:!w-[28rem]"
    header="AI Shop Assistant"
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

          <!--
            The greeting, and storefront copy rather than anything the model
            produced. It sits outside `assistant.messages`, which is the array
            sent to the chat route, so it costs no provider call and never
            enters the history the provider sees.
          -->
          <p v-if="assistant.isEmpty" class="text-sm text-surface-500">
            Hi, I'm the shop assistant. Ask me anything about the products, your
            cart, or how ordering works. I can add things for you and draft an
            order, but you confirm it yourself.
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

          <!--
            aria-live so a screen reader hears the wait and its one change
            rather than silence. The spinner is decorative next to that text,
            so it is hidden from the reader instead of being read as an image.
          -->
          <p
            v-if="assistant.pending"
            class="flex items-center gap-2 font-medium text-surface-700 dark:text-surface-300"
            role="status"
            aria-live="polite"
          >
            <i class="pi pi-spin pi-spinner text-primary" aria-hidden="true" />
            {{ waitingLabel }}
          </p>

          <!-- The draft: the shop's lines and the shop's total, with the
               details editable before anything is submitted. -->
          <div
            v-if="assistant.draft"
            class="rounded-lg border border-surface-300 bg-surface-0 p-4 dark:border-surface-700 dark:bg-surface-900"
          >
            <p class="mb-3 font-medium">Review your order</p>

            <ul class="mb-3 space-y-1 text-sm">
              <li
                v-for="line in draftLines"
                :key="line.name"
                class="flex justify-between gap-4"
              >
                <span>{{ line.name }} &times; {{ line.quantity }}</span>
                <span>{{ formatMoney(line.amountCents) }}</span>
              </li>
            </ul>

            <p class="mb-3 flex items-center justify-between gap-2 border-t border-surface-200 pt-2 text-sm font-medium dark:border-surface-800">
              <span class="flex items-center gap-2">
                Total
                <Tag v-if="codeApplied" severity="danger" :value="`${promoPercent}% off`" />
              </span>
              <span>{{ formatMoney(draftTotalCents) }}</span>
            </p>

            <div class="flex flex-col gap-2">
              <InputText v-model="details.name" placeholder="Name" size="small" />
              <InputText v-model="details.email" placeholder="Email" size="small" />
              <InputText v-model="details.phone" placeholder="Phone (optional)" size="small" />
              <Textarea v-model="details.notes" placeholder="Notes (optional)" rows="2" auto-resize />

              <!-- Typed by the visitor, never by the assistant. See the script. -->
              <div class="flex gap-2">
                <InputText
                  v-model="promoCode"
                  placeholder="Promo code (optional)"
                  size="small"
                  maxlength="60"
                  autocomplete="off"
                  class="flex-1"
                  aria-describedby="draft-promo-message"
                  :disabled="submitting"
                  @keydown.enter.prevent="applyPromoCode"
                />
                <Button
                  type="button"
                  label="Apply"
                  size="small"
                  outlined
                  :loading="applying"
                  :disabled="submitting || (!promoCode.trim() && !appliedCode)"
                  @click="applyPromoCode"
                />
              </div>
              <Message
                v-if="promoMessage"
                id="draft-promo-message"
                :severity="promoMessage.severity"
                size="small"
                variant="simple"
              >
                {{ promoMessage.text }}
              </Message>
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
            ref="messageBox"
            v-model="input"
            class="flex-1"
            placeholder="Chat with the AI Shop Assistant"
            aria-label="Message the AI Shop Assistant"
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
