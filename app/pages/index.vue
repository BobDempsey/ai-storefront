<script setup lang="ts">
import type { DigitalProduct, Product } from '~/types'
import { formatBytes } from '~/utils/bytes'

const { data: products, error } = await useFetch<Product[]>('/api/products')
const cart = useCartStore()
const assistant = useAssistantStore()
const { storeName } = useRuntimeConfig().public

// What the assistant can actually do, in the visitor's terms. Each line maps to
// a tool in server/utils/assistant.ts: search_catalogue and get_product, then
// get_cart and propose_cart_change, then draft_order. Keep them in step. The
// last line is the boundary the prompt enforces, and saying it up front is
// cheaper than a visitor spending a message to find it out.
const CAN_DO = [
  'Find something by what it is for, not just by name',
  'Answer what a print is made of, how big it is and what it costs',
  'Add to or clear your cart, for you to approve',
  'Fill in an order for you to check and confirm yourself'
]

const physical = computed(() => products.value?.filter(p => p.kind !== 'digital') ?? [])
const files = computed(
  () => products.value?.filter((p): p is DigitalProduct => p.kind === 'digital') ?? []
)

// Icon classes are presentation, so the format maps to one here rather than
// tying the catalogue to PrimeVue's icon set.
const FORMAT_ICONS: Record<string, string> = {
  '3MF': 'pi pi-palette',
  STL: 'pi pi-box',
  STEP: 'pi pi-sliders-h',
  OBJ: 'pi pi-box',
  ZIP: 'pi pi-folder'
}
const iconFor = (format: string) => FORMAT_ICONS[format.toUpperCase()] ?? 'pi pi-file'

useSeoMeta({
  title: 'Shop',
  description: 'Browse the catalogue and submit an order request.'
})
</script>

<template>
  <!--
    The introduction. It names the assistant before the visitor meets the dot on
    the navbar, because a chat panel on a shop is worth explaining rather than
    discovering. Every claim here is written against the tool list rather than
    the marketing of it, including the one about what it cannot do: the model is
    never given a way to place an order or to touch a promo code, and a visitor
    who knows that reads a refusal as the design rather than a failure.

    Nothing here is specific to this shop. It renders `storeName` and describes
    the assistant, both of which the second deployment has too, so this section
    does not have to be edited or hidden when the same code runs another store.
  -->
  <section class="mb-6 rounded-xl border border-surface-200 bg-surface-0 p-4 sm:p-6 dark:border-surface-800 dark:bg-surface-900">
    <h1 class="text-2xl font-semibold tracking-tight">{{ storeName }}</h1>

    <p class="mt-3 max-w-2xl text-surface-600 dark:text-surface-400">
      A small shop for 3D-printed things: finished prints under
      <strong>Products</strong>, and the files to print your own under
      <strong>Files</strong>. Ordering here is a request rather than a checkout.
      You send a cart, we reply by email to confirm it and arrange payment, and
      nothing is charged on the site.
    </p>

    <div class="mt-6 rounded-lg border border-surface-200 bg-surface-50 p-4 sm:p-5 dark:border-surface-800 dark:bg-surface-950">
      <h2 class="flex items-center gap-2 font-medium">
        <i class="pi pi-microchip-ai text-primary" />
        Shop by asking
      </h2>

      <p class="mt-2 max-w-2xl text-sm text-surface-600 dark:text-surface-400">
        There is an assistant on this site that knows the catalogue and your
        cart. Tell it what you are after and it will do the looking.
      </p>

      <ul class="mt-4 grid gap-2 sm:grid-cols-2">
        <li
          v-for="item in CAN_DO"
          :key="item"
          class="flex items-start gap-2 text-sm text-surface-600 dark:text-surface-400"
        >
          <i class="pi pi-check mt-1 text-xs text-primary" />
          <span>{{ item }}</span>
        </li>
      </ul>

      <p class="mt-4 max-w-2xl text-sm text-surface-500">
        It cannot place an order, take a payment or hand out a discount. It
        writes the order up and hands it back to you; nothing is submitted until
        you press the button yourself.
      </p>

      <Button
        class="mt-5"
        label="Ask the assistant"
        icon="pi pi-microchip-ai"
        size="small"
        @click="assistant.openDrawer()"
      />
    </div>
  </section>

  <!--
    Three layers of horizontal padding stack up between the viewport and a
    product card: this section, PrimeVue's own .p-tabpanels, and the layout's
    px-4 on <main>. At 390px that left 118px of the screen as padding and the
    cards too narrow. The two inner layers drop away below sm; the layout's
    16px page gutter stays, because that one is the margin of the page itself.
  -->
  <section class="rounded-xl border border-surface-200 bg-surface-0 p-4 sm:p-6 dark:border-surface-800 dark:bg-surface-900">
    <!-- Demoted from h1: the introduction above owns the page's heading now. -->
    <h2 class="mb-8 text-2xl font-semibold tracking-tight">Shop</h2>

    <Tabs value="products">
      <TabList>
        <Tab value="products" class="flex items-center gap-2">
          <i class="pi pi-box" />
          Products
        </Tab>
        <Tab value="files" class="flex items-center gap-2">
          <i class="pi pi-file" />
          Files
        </Tab>
      </TabList>

      <TabPanels class="!px-0 sm:!px-[18px]">
        <TabPanel value="products" class="pt-6">
          <Message v-if="error" severity="error">
            Could not load products. Check the Supabase configuration in <code>.env</code>.
          </Message>

          <div v-else class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <article
              v-for="product in physical"
              :key="product.id"
              class="flex flex-col overflow-hidden rounded-lg border border-surface-200 bg-surface-0 dark:border-surface-800 dark:bg-surface-900"
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
                <p class="text-sm text-surface-500">
                  <SalePrice
                    :price-cents="product.price_cents"
                    :original-price-cents="product.originalPriceCents"
                    :sale-percent="product.salePercent"
                  />
                </p>

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
        </TabPanel>

        <TabPanel value="files" class="pt-6">
          <Message v-if="error" severity="error">
            Could not load files. Check the Supabase configuration in <code>.env</code>.
          </Message>

          <p v-else-if="!files.length" class="text-sm text-surface-500">
            No files are listed yet.
          </p>

          <div v-else class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <article
              v-for="file in files"
              :key="file.id"
              class="flex flex-col gap-2 rounded-lg border border-surface-200 bg-surface-0 p-4 dark:border-surface-800 dark:bg-surface-900"
            >
              <div class="flex items-center gap-3">
                <i :class="iconFor(file.file_format)" class="text-xl text-surface-500" />
                <div>
                  <NuxtLink :to="`/products/${file.slug}`" class="font-medium hover:underline">
                    {{ file.name }}
                  </NuxtLink>
                  <p class="text-sm text-surface-500">
                    {{ file.file_format }}, {{ formatBytes(file.file_size_bytes) }}
                  </p>
                </div>
              </div>

              <p class="text-sm text-surface-600 dark:text-surface-400">{{ file.description }}</p>
              <code class="text-xs text-surface-500">{{ file.file_name }}</code>
              <p class="text-sm font-medium">
                <SalePrice
                  :price-cents="file.price_cents"
                  :original-price-cents="file.originalPriceCents"
                  :sale-percent="file.salePercent"
                />
              </p>
              <p class="text-xs text-surface-500">Emailed to you once payment is arranged.</p>

              <Button
                class="mt-auto"
                :label="cart.quantityOf(file.id) ? 'In cart' : 'Add to cart'"
                :disabled="Boolean(cart.quantityOf(file.id))"
                size="small"
                @click="cart.add(file.id, 1, { single: true })"
              />
            </article>
          </div>
        </TabPanel>

      </TabPanels>
    </Tabs>
  </section>
</template>
