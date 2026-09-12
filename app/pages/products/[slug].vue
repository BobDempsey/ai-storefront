<script setup lang="ts">
import type { Product } from '~/types'
import { formatBytes } from '~/utils/bytes'

const route = useRoute()
const cart = useCartStore()
const assistant = useAssistantStore()
const added = ref(false)

const { data: product } = await useFetch<Product>(`/api/products/${route.params.slug}`)
if (!product.value) {
  throw createError({ statusCode: 404, statusMessage: 'Product not found', fatal: true })
}

// `image_url` is a site-relative path, which no Open Graph consumer will
// resolve, so it is made absolute against siteUrl. Without siteUrl the layout's
// default share image stands rather than a broken product one.
const { siteUrl } = useRuntimeConfig().public

// Catalogue descriptions run to a paragraph, and a search result or a link
// preview shows about 160 characters before it cuts. Take the lead sentence
// instead, which is the one written to carry the product on its own, and fall
// back to a hard trim if a description ever arrives without a full stop.
function summarize(text: string | null | undefined) {
  if (!text) return ''
  const stop = text.indexOf('. ')
  if (stop !== -1 && stop < 200) return text.slice(0, stop + 1)
  return text.length > 160 ? `${text.slice(0, 157).trimEnd()}…` : text
}

useSeoMeta({
  title: () => product.value?.name,
  description: () => summarize(product.value?.description),
  ogTitle: () => product.value?.name,
  ogDescription: () => summarize(product.value?.description),
  ogType: 'website',
  ogImage: () => {
    const path = product.value?.image_url
    if (!siteUrl || !path) return undefined
    return path.startsWith('http') ? path : `${siteUrl}${path}`
  },
  ogImageAlt: () => product.value?.name,
  // The layout declares 1200x630 for the share image. Catalogue photos are
  // square, and a consumer that believes the inherited numbers reserves a
  // letterbox and crops the picture into it, so restate the real size here.
  ogImageWidth: 800,
  ogImageHeight: 800,
  // Square is not a large-image card. Saying so gets the photo shown whole
  // rather than cropped to a 1.91:1 strip.
  twitterCard: 'summary'
})

const isFile = computed(() => product.value?.kind === 'digital')

/**
 * Opens the panel with a question about this product already written, for the
 * visitor to send, edit or replace. Nothing is sent here, so the button costs
 * no provider call however often it is pressed.
 *
 * The question is built from `product.name`, the same value the heading
 * renders, so the text and the page cannot name different things. The assistant
 * is told nothing about which page the visitor is on: it learns the product
 * from the words, exactly as if they had been typed.
 */
function askAboutThis() {
  if (!product.value) return
  void assistant.openDrawer(`Tell me more about the ${product.value.name}.`)
}

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
        <Button
          label="Ask about this"
          icon="pi pi-microchip-ai"
          severity="secondary"
          outlined
          @click="askAboutThis"
        />
        <NuxtLink v-if="added" to="/cart" class="text-sm underline">View cart</NuxtLink>
      </div>
    </div>
  </article>
</template>
