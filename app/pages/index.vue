<script setup lang="ts">
import type { Product } from '~/types'
import { formatMoney } from '~/utils/money'

const { data: products, error } = await useFetch<Product[]>('/api/products')
const cart = useCartStore()

useSeoMeta({
  title: 'Shop',
  description: 'Browse the catalogue and submit an order request.'
})
</script>

<template>
  <section>
    <h1 class="mb-8 text-2xl font-semibold tracking-tight">Shop</h1>

    <Message v-if="error" severity="error">
      Could not load products. Check the Supabase configuration in <code>.env</code>.
    </Message>

    <div v-else class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <article
        v-for="product in products"
        :key="product.id"
        class="flex flex-col overflow-hidden rounded-lg border border-surface-200 bg-white"
      >
        <NuxtLink :to="`/products/${product.slug}`">
          <img
            v-if="product.image_url"
            :src="product.image_url"
            :alt="product.name"
            class="aspect-square w-full object-cover"
            loading="lazy"
          >
        </NuxtLink>

        <div class="flex flex-1 flex-col gap-2 p-4">
          <NuxtLink :to="`/products/${product.slug}`" class="font-medium hover:underline">
            {{ product.name }}
          </NuxtLink>
          <p class="text-sm text-surface-500">{{ formatMoney(product.price_cents) }}</p>

          <Button
            class="mt-auto"
            :label="product.in_stock ? 'Add to cart' : 'Out of stock'"
            :disabled="!product.in_stock"
            size="small"
            @click="cart.add(product.id)"
          />
        </div>
      </article>
    </div>
  </section>
</template>
