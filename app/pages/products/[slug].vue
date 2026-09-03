<script setup lang="ts">
import type { Product } from '~/types'
import { formatBytes } from '~/utils/bytes'

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

const isFile = computed(() => product.value?.kind === 'digital')

function addToCart() {
  if (!product.value) return
  cart.add(product.value.id, 1, { single: isFile.value })
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
    <!-- A file has no photograph, so its format stands in for one. -->
    <div
      v-else-if="product.kind === 'digital'"
      class="flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-lg border border-surface-200 bg-surface-0 dark:border-surface-800 dark:bg-surface-900"
    >
      <i class="pi pi-file text-5xl text-surface-400" />
      <p class="text-sm text-surface-500">{{ product.file_format }}</p>
    </div>

    <div class="flex flex-col gap-4">
      <NuxtLink to="/" class="text-sm text-surface-500 hover:underline">&larr; All products</NuxtLink>

      <h1 class="text-2xl font-semibold tracking-tight">{{ product.name }}</h1>
      <p class="text-xl">
        <SalePrice
          :price-cents="product.price_cents"
          :original-price-cents="product.originalPriceCents"
          :sale-percent="product.salePercent"
        />
      </p>
      <p class="text-surface-600 dark:text-surface-400">{{ product.description }}</p>

      <dl v-if="product.kind === 'digital'" class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt class="text-surface-500">File</dt>
        <dd><code>{{ product.file_name }}</code></dd>
        <dt class="text-surface-500">Format</dt>
        <dd>{{ product.file_format }}</dd>
        <dt class="text-surface-500">Size</dt>
        <dd>{{ formatBytes(product.file_size_bytes) }}</dd>
      </dl>

      <p v-if="product.kind === 'digital'" class="text-sm text-surface-500">
        We email this file to you once payment is arranged. There is no download here.
      </p>

      <div class="mt-4 flex items-center gap-3">
        <Button
          v-if="isFile"
          :label="cart.quantityOf(product.id) ? 'In cart' : 'Add to cart'"
          :disabled="Boolean(cart.quantityOf(product.id))"
          @click="addToCart"
        />
        <Button
          v-else
          :label="product.in_stock ? 'Add to cart' : 'Out of stock'"
          :disabled="!product.in_stock"
          @click="addToCart"
        />
        <NuxtLink v-if="added" to="/cart" class="text-sm underline">View cart</NuxtLink>
      </div>
    </div>
  </article>
</template>
