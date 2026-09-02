<script setup lang="ts">
import type { DigitalProduct, Product } from '~/types'
import { formatMoney } from '~/utils/money'
import { formatBytes } from '~/utils/bytes'

const { data: products, error } = await useFetch<Product[]>('/api/products')
const cart = useCartStore()

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
  <section class="rounded-xl border border-surface-200 bg-surface-0 p-6 dark:border-surface-800 dark:bg-surface-900">
    <h1 class="mb-8 text-2xl font-semibold tracking-tight">Shop</h1>

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

      <TabPanels>
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
              <p class="text-sm font-medium">{{ formatMoney(file.price_cents) }}</p>
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
