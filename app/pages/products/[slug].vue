<script setup lang="ts">
import type { Product } from '~/types'
import { formatMoney } from '~/utils/money'

const route = useRoute()
const cart = useCartStore()
const added = ref(false)

const { data: product } = await useFetch<Product>(`/api/products/${route.params.slug}`)
if (!product.value) {
  throw createError({ statusCode: 404, statusMessage: 'Product not found', fatal: true })
}

useSeoMeta({
  title: () => product.value?.name,
  description: () => product.value?.description ?? '',
  ogImage: () => product.value?.image_url ?? ''
})

function addToCart() {
  if (!product.value) return
  cart.add(product.value.id)
  added.value = true
}
</script>

<template>
  <article v-if="product" class="grid gap-10 md:grid-cols-2">
    <img
      v-if="product.image_url"
      :src="product.image_url"
      :alt="product.name"
      class="aspect-square w-full rounded-lg object-cover"
    >

    <div class="flex flex-col gap-4">
      <NuxtLink to="/" class="text-sm text-surface-500 hover:underline">&larr; All products</NuxtLink>

      <h1 class="text-2xl font-semibold tracking-tight">{{ product.name }}</h1>
      <p class="text-xl">{{ formatMoney(product.price_cents) }}</p>
      <p class="text-surface-600">{{ product.description }}</p>

      <div class="mt-4 flex items-center gap-3">
        <Button
          :label="product.in_stock ? 'Add to cart' : 'Out of stock'"
          :disabled="!product.in_stock"
          @click="addToCart"
        />
        <NuxtLink v-if="added" to="/cart" class="text-sm underline">View cart</NuxtLink>
      </div>
    </div>
  </article>
</template>
