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

// The store hydrates from localStorage after mount, so fetch once it is ready.
onMounted(() => {
  if (!cart.isEmpty) refresh()
})

// Drop lines whose product has disappeared from the catalogue.
watch(preview, value => {
  value?.missing.forEach(id => cart.remove(id))
})

function updateQuantity(productId: string, quantity: number) {
  cart.setQuantity(productId, quantity)
  refresh()
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
          class="flex items-center gap-4 rounded-lg border border-surface-200 bg-white p-4"
        >
          <img v-if="line.image_url" :src="line.image_url" :alt="line.name" class="size-16 rounded object-cover">

          <div class="flex-1">
            <NuxtLink :to="`/products/${line.slug}`" class="font-medium hover:underline">{{ line.name }}</NuxtLink>
            <p class="text-sm text-surface-500">{{ formatMoney(line.price_cents) }} each</p>
            <p v-if="!line.in_stock" class="text-sm text-red-600">No longer available</p>
          </div>

          <InputNumber
            :model-value="line.quantity"
            :min="1"
            :max="99"
            show-buttons
            button-layout="horizontal"
            input-class="w-12 text-center"
            @update:model-value="updateQuantity(line.id, $event)"
          />

          <p class="w-24 text-right font-medium">{{ formatMoney(line.price_cents * line.quantity) }}</p>

          <Button icon="pi pi-times" text severity="secondary" aria-label="Remove" @click="updateQuantity(line.id, 0)" />
        </div>

        <div class="flex items-center justify-between border-t border-surface-200 pt-4">
          <span class="text-lg">Subtotal</span>
          <span class="text-lg font-semibold">{{ formatMoney(preview?.subtotalCents ?? 0) }}</span>
        </div>

        <div class="flex justify-end">
          <Button
            label="Continue to checkout"
            :loading="status === 'pending'"
            @click="navigateTo('/checkout')"
          />
        </div>
      </div>
    </ClientOnly>
  </section>
</template>
