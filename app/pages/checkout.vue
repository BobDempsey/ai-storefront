<script setup lang="ts">
import type { CartPreview } from '~/types'
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

async function submitOrder() {
  errorMessage.value = ''
  submitting.value = true

  try {
    const { orderId } = await $fetch<{ orderId: string }>('/api/orders', {
      method: 'POST',
      body: { customer: form, items: cart.items }
    })

    cart.clear()
    await navigateTo({ path: '/order-received', query: { id: orderId } })
  } catch (error: any) {
    errorMessage.value = error?.data?.statusMessage ?? 'Something went wrong. Please try again.'
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

      <Message v-if="errorMessage" severity="error" class="mb-6">{{ errorMessage }}</Message>

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

        <Button type="submit" label="Submit order" :loading="submitting" class="self-start" />

        <p class="text-sm text-surface-500">
          Submitting sends your order to our team. We will reply by email to confirm
          availability and arrange payment — nothing is charged here.
        </p>
      </form>
    </div>

    <aside class="h-fit rounded-lg border border-surface-200 bg-surface-0 dark:border-surface-800 dark:bg-surface-900 p-4">
      <h2 class="mb-4 font-medium">Order summary</h2>

      <ClientOnly>
        <ul class="flex flex-col gap-2 text-sm">
          <li v-for="line in preview?.lines" :key="line.id" class="flex justify-between gap-4">
            <span>{{ line.name }} &times; {{ line.quantity }}</span>
            <span>{{ formatMoney(line.price_cents * line.quantity) }}</span>
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
