<script setup lang="ts">
import { errorData, errorStatus, messageFor } from '~/utils/errors'
import type { CartPreview, OrderConflictData, OrderPromoErrorData, OrderResponse } from '~/types'
import { formatMoney } from '~/utils/money'

const cart = useCartStore()
// Matches the server's cap in server/utils/schemas.ts, so the field cannot
// accept text the order endpoint would reject.
const NOTES_MAX = 500

const form = reactive({ name: '', email: '', phone: '', notes: '', promoCode: '', subscribe: false })
const submitting = ref(false)
const errorMessage = ref('')

// Names the discount on the opt-in label, so it tracks the active code.
const { optinOffer } = useStoreSettings()

// The code the preview was last priced with. Typing alone changes nothing:
// the buyer applies a code deliberately, and the total moves only then.
const appliedCode = ref('')
const applying = ref(false)

const { data: preview, refresh } = await useFetch<CartPreview>('/api/cart/preview', {
  method: 'POST',
  body: computed(() => ({
    items: cart.items,
    promoCode: appliedCode.value || undefined,
    email: form.email || undefined
  })),
  immediate: false,
  watch: false
})

// What the server said about the applied code. `create_order` checks it again
// at submit time, so this is what the buyer sees, not what they are charged on.
const promoStatus = computed(() => preview.value?.promoStatus)

const promoMessage = computed(() => {
  switch (promoStatus.value) {
    case 'applied':
      return { severity: 'success' as const, text: `Code applied. ${salePercent.value}% off.` }
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

/** Re-prices the cart with the typed code. Clearing the field removes it. */
async function applyPromoCode() {
  applying.value = true
  appliedCode.value = form.promoCode.trim()
  try {
    await refresh()
    // A rejected code must not sit in the field: leaving it there means
    // Submit resends the same code and gets the same rejection again.
    if (promoStatus.value && promoStatus.value !== 'applied') {
      form.promoCode = ''
      appliedCode.value = ''
    }
  } finally {
    applying.value = false
  }
}

onMounted(() => {
  if (cart.isEmpty) void navigateTo('/cart')
  else void refresh()
})

// Products the server named in a 409. Kept alongside the preview's own stock
// flags because the server is the authority and may have seen a stock change
// this page has not.
const conflictIds = ref<string[]>([])

// Store-wide, so any priced line's percentage speaks for the whole order.
const salePercent = computed(() => preview.value?.lines[0]?.salePercent ?? 0)
const saleActive = computed(() => salePercent.value > 0)

const unavailableLines = computed(
  () => preview.value?.lines.filter(line => !line.in_stock || conflictIds.value.includes(line.id)) ?? []
)
const unavailableNames = computed(() => unavailableLines.value.map(line => line.name).join(', '))

async function submitOrder() {
  errorMessage.value = ''
  conflictIds.value = []
  submitting.value = true

  try {
    // Re-price immediately before submitting, so a page left open while stock
    // changed does not send a line the server is about to refuse.
    await refresh()
    if (unavailableLines.value.length) {
      errorMessage.value = `${unavailableNames.value} is no longer available. Remove it from your cart to continue.`
      return
    }

    const { orderId } = await $fetch<OrderResponse>('/api/orders', {
      method: 'POST',
      body: {
        customer: {
          name: form.name,
          email: form.email,
          phone: form.phone,
          notes: form.notes
        },
        items: cart.items,
        // The code only, never a price: create_order resolves it and decides
        // between it and the store-wide sale.
        promoCode: form.promoCode.trim() || undefined,
        subscribe: form.subscribe
      }
    })

    cart.clear()
    // The cart is cleared on the way out, so the confirmation cannot work out
    // for itself whether a file is owed. Carry it across.
    const files = preview.value?.lines.some(line => line.kind === 'digital') ? '1' : undefined
    await navigateTo({ path: '/order-received', query: { id: orderId, files } })
  } catch (error: unknown) {
    // The cart and the form are deliberately left untouched: a rejected order
    // must leave the customer somewhere they can act, not start again.
    const conflict = errorData<OrderConflictData>(error)
    if (errorStatus(error) === 409) {
      conflictIds.value = conflict?.unavailableProductIds ?? []
      await refresh()
    }

    // A code refused at submit time: re-price so the summary drops the
    // discount the buyer was shown, and let the field's own message name it.
    if (errorData<OrderPromoErrorData>(error)?.promoStatus) {
      await applyPromoCode()
      return
    }

    errorMessage.value = unavailableLines.value.length
      ? `${unavailableNames.value} is no longer available. Remove it from your cart to continue.`
      : messageFor(error, 'Something went wrong. Please try again.')
  } finally {
    submitting.value = false
  }
}

useSeoMeta({ title: 'Checkout', robots: 'noindex' })
</script>

<template>
  <section class="grid gap-10 md:grid-cols-[1fr_20rem]">
    <div>
      <h1 class="mb-8 text-2xl font-semibold tracking-tight">Your details</h1>

      <Message v-if="errorMessage" severity="error" class="mb-6">
        {{ errorMessage }}
        <NuxtLink v-if="unavailableLines.length" to="/cart" class="underline">Back to your cart</NuxtLink>
      </Message>

      <Message v-else-if="unavailableLines.length" severity="warn" class="mb-6">
        {{ unavailableNames }} cannot be ordered at the moment. Remove it in
        <NuxtLink to="/cart" class="underline">your cart</NuxtLink> to continue.
      </Message>

      <form class="flex flex-col gap-5" @submit.prevent="submitOrder">
        <div class="flex flex-col gap-2">
          <label for="name">Name</label>
          <InputText id="name" v-model="form.name" required autocomplete="name" />
        </div>

        <div class="flex flex-col gap-2">
          <label for="email">Email</label>
          <InputText id="email" v-model="form.email" type="email" required autocomplete="email" />
        </div>

        <div class="flex flex-col gap-2">
          <label for="phone">Phone <span class="text-surface-400">(optional)</span></label>
          <InputText id="phone" v-model="form.phone" autocomplete="tel" />
        </div>

        <div class="flex flex-col gap-2">
          <label for="notes">Notes <span class="text-surface-400">(optional)</span></label>
          <Textarea
            id="notes"
            v-model="form.notes"
            rows="4"
            auto-resize
            :maxlength="NOTES_MAX"
            aria-describedby="notes-count"
          />
          <p id="notes-count" class="text-right text-xs text-surface-500">
            {{ form.notes.length }} / {{ NOTES_MAX }}
          </p>
        </div>

        <div class="flex flex-col gap-2">
          <label for="promo">Promo code <span class="text-surface-400">(optional)</span></label>
          <div class="flex gap-2">
            <InputText
              id="promo"
              v-model="form.promoCode"
              maxlength="60"
              autocomplete="off"
              class="flex-1"
              aria-describedby="promo-message"
              @keydown.enter.prevent="applyPromoCode"
            />
            <Button
              type="button"
              label="Apply"
              outlined
              :loading="applying"
              :disabled="!form.promoCode.trim() && !appliedCode"
              @click="applyPromoCode"
            />
          </div>
          <Message
            v-if="promoMessage"
            id="promo-message"
            :severity="promoMessage.severity"
            size="small"
            variant="simple"
          >
            {{ promoMessage.text }}
          </Message>
        </div>

        <div class="flex items-start gap-2">
          <Checkbox v-model="form.subscribe" input-id="checkout-subscribe" binary />
          <label for="checkout-subscribe" class="text-sm text-surface-600 dark:text-surface-400">
            <span v-if="optinOffer">Email me updates and {{ optinOffer }}</span>
            <span v-else>Email me updates from the shop</span>
          </label>
        </div>

        <Button
          type="submit"
          label="Submit order"
          :loading="submitting"
          :disabled="unavailableLines.length > 0"
          class="self-start"
        />

        <p class="text-sm text-surface-500">
          Submitting sends your order to our team. We reply by email to confirm
          availability and arrange payment. Nothing is charged here.
        </p>
      </form>
    </div>

    <aside class="h-fit rounded-lg border border-surface-200 bg-surface-0 dark:border-surface-800 dark:bg-surface-900 p-4">
      <h2 class="mb-4 flex items-center gap-2 font-medium">
        Order summary
        <Tag v-if="saleActive" severity="danger" :value="`${salePercent}% off`" />
      </h2>

      <ClientOnly>
        <ul class="flex flex-col gap-2 text-sm">
          <li v-for="line in preview?.lines" :key="line.id" class="flex justify-between gap-4">
            <span>
              {{ line.name }} &times; {{ line.quantity }}
              <span v-if="!line.in_stock" class="block text-red-600 dark:text-red-400">Out of stock</span>
            </span>
            <span :class="{ 'text-surface-400 line-through': !line.in_stock }">
              {{ formatMoney(line.price_cents * line.quantity) }}
            </span>
          </li>
        </ul>

        <div class="mt-4 flex justify-between border-t border-surface-200 pt-4 dark:border-surface-800 font-medium">
          <span>Total</span>
          <span>{{ formatMoney(preview?.subtotalCents ?? 0) }}</span>
        </div>
      </ClientOnly>
    </aside>
  </section>
</template>
