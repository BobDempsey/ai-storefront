<script setup lang="ts">
import type { CartPreview } from '~/types'
import { formatMoney } from '~/utils/money'

const cart = useCartStore()

// Prices are resolved server-side on every render of this page.
const { data: preview, refresh, status } = await useFetch<CartPreview>('/api/cart/preview', {
  method: 'POST',
  body: computed(() => ({ items: cart.items })),
  immediate: !cart.isEmpty,
  watch: false
})

// The store hydrates from its persisted cookie after mount, so fetch once it is
// ready.
onMounted(() => {
  if (!cart.isEmpty) refresh()
})

// Drop lines whose product has disappeared from the catalogue. This runs
// immediately because the preview is usually resolved during SSR: waiting for a
// change would leave the deleted id in the cart, and in the header count, until
// some later fetch happened to replace the value.
watch(preview, value => {
  value?.missing.forEach(id => cart.remove(id))
}, { immediate: true })

// Lines still in the catalogue that cannot currently be ordered. Unlike deleted
// products these are never removed automatically. The customer decides.
const unavailableLines = computed(() => preview.value?.lines.filter(line => !line.in_stock) ?? [])
const unavailableNames = computed(() => unavailableLines.value.map(line => line.name).join(', '))
const everythingUnavailable = computed(
  () => unavailableLines.value.length > 0 && unavailableLines.value.length === preview.value?.lines.length
)

function updateQuantity(productId: string, quantity: number) {
  cart.setQuantity(productId, quantity)
  // Removing the last line empties the cart, and the preview endpoint rejects an
  // empty items array. Nothing needs pricing at that point, so skip the fetch.
  if (!cart.isEmpty) refresh()
}

useSeoMeta({ title: 'Your cart', robots: 'noindex' })
</script>

<template>
  <section>
    <h1 class="mb-8 text-2xl font-semibold tracking-tight">Your cart</h1>

    <ClientOnly>
      <div v-if="cart.isEmpty" class="text-surface-600">
        Your cart is empty. <NuxtLink to="/" class="underline">Browse products</NuxtLink>.
      </div>

      <div v-else class="flex flex-col gap-6">
        <div
          v-for="line in preview?.lines"
          :key="line.id"
          class="flex flex-wrap items-center gap-4 rounded-lg border bg-surface-0 dark:bg-surface-900 p-4"
          :class="line.in_stock
            ? 'border-surface-200 dark:border-surface-800'
            : 'border-red-300 dark:border-red-800'"
        >
          <img
            v-if="line.image_url"
            :src="line.image_url"
            :alt="line.name"
            class="size-16 shrink-0 rounded object-cover"
            :class="{ 'opacity-50': !line.in_stock }"
          >
          <div
            v-else-if="line.kind === 'digital'"
            class="flex size-16 shrink-0 items-center justify-center rounded bg-surface-100 dark:bg-surface-800"
          >
            <i class="pi pi-file text-xl text-surface-500" />
          </div>

          <div class="min-w-0 flex-1 basis-40">
            <NuxtLink :to="`/products/${line.slug}`" class="font-medium hover:underline">{{ line.name }}</NuxtLink>
            <p class="text-sm text-surface-500">{{ formatMoney(line.price_cents) }} each</p>
            <p v-if="line.kind === 'digital'" class="text-sm text-surface-500">
              {{ line.file_name }}, emailed to you once payment is arranged.
            </p>
            <p v-if="!line.in_stock" class="text-sm font-medium text-red-600 dark:text-red-400">
              Out of stock. Remove it to continue.
            </p>
          </div>

          <!-- Quantity, price and remove travel together: on a narrow screen they
               drop onto their own row rather than pushing the card sideways. -->
          <div class="flex w-full items-center justify-between gap-4 sm:w-auto sm:justify-end">
            <!-- A file is emailed once, so its quantity is fixed and it gets no
                 control to change. Physical lines keep theirs. -->
            <p v-if="line.kind === 'digital'" class="text-sm text-surface-500">
              Quantity 1
            </p>
            <InputNumber
              v-else
              :model-value="line.quantity"
              :min="1"
              :max="99"
              :disabled="!line.in_stock"
              show-buttons
              button-layout="horizontal"
              input-class="w-12 text-center"
              @update:model-value="updateQuantity(line.id, $event)"
            />

            <p class="text-right font-medium sm:w-24" :class="{ 'text-surface-400 line-through': !line.in_stock }">
              {{ formatMoney(line.price_cents * line.quantity) }}
            </p>

            <Button
              v-if="line.in_stock"
              icon="pi pi-times"
              text
              severity="secondary"
              aria-label="Remove"
              @click="updateQuantity(line.id, 0)"
            />
            <Button
              v-else
              label="Remove"
              icon="pi pi-times"
              severity="danger"
              outlined
              @click="updateQuantity(line.id, 0)"
            />
          </div>
        </div>

        <div class="flex items-center justify-between border-t border-surface-200 pt-4 dark:border-surface-800">
          <div>
            <span class="text-lg">Subtotal</span>
            <p v-if="unavailableLines.length" class="text-sm text-surface-500">
              Out-of-stock items are not included in this total.
            </p>
          </div>
          <span class="text-lg font-semibold">{{ formatMoney(preview?.subtotalCents ?? 0) }}</span>
        </div>

        <Message v-if="everythingUnavailable" severity="warn">
          Nothing in your cart is available right now. Remove these items, then
          <NuxtLink to="/" class="underline">browse the catalogue</NuxtLink>.
        </Message>
        <Message v-else-if="unavailableLines.length" severity="warn">
          Remove {{ unavailableNames }} to continue to checkout.
        </Message>

        <div class="flex justify-end">
          <Button
            label="Continue to checkout"
            :loading="status === 'pending'"
            :disabled="unavailableLines.length > 0"
            @click="navigateTo('/checkout')"
          />
        </div>
      </div>
    </ClientOnly>
  </section>
</template>
