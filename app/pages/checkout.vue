<script setup lang="ts">
import type { CartPreview, OrderConflictData, OrderResponse } from '~/types'
import { formatMoney } from '~/utils/money'

const cart = useCartStore()
const form = reactive({ name: '', email: '', phone: '', notes: '' })
const submitting = ref(false)
const errorMessage = ref('')

const { data: preview, refresh } = await useFetch<CartPreview>('/api/cart/preview', {
  method: 'POST',
  body: computed(() => ({ items: cart.items })),
  immediate: false,
  watch: false
})

onMounted(() => {
  if (cart.isEmpty) navigateTo('/cart')
  else refresh()
})

// Products the server named in a 409. Kept alongside the preview's own stock
// flags because the server is the authority and may have seen a stock change
// this page has not.
const conflictIds = ref<string[]>([])

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
      body: { customer: form, items: cart.items }
    })

    cart.clear()
    await navigateTo({ path: '/order-received', query: { id: orderId } })
  } catch (error: any) {
    // The cart and the form are deliberately left untouched: a rejected order
    // must leave the customer somewhere they can act, not start again.
    const conflict = error?.data?.data as OrderConflictData | undefined
    if (error?.statusCode === 409) {
      conflictIds.value = conflict?.unavailableProductIds ?? []
      await refresh()
    }

    errorMessage.value = unavailableLines.value.length
      ? `${unavailableNames.value} is no longer available. Remove it from your cart to continue.`
      : error?.data?.statusMessage ?? 'Something went wrong. Please try again.'
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
          <Textarea id="notes" v-model="form.notes" rows="4" auto-resize />
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
      <h2 class="mb-4 font-medium">Order summary</h2>

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
