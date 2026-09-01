<script setup lang="ts">
const orderId = useRoute().query.id as string | undefined

useSeoMeta({ title: 'Order received', robots: 'noindex' })
</script>

<template>
  <section class="mx-auto max-w-md text-center">
    <i class="pi pi-check-circle mb-4 text-4xl text-green-600" />
    <h1 class="mb-3 text-2xl font-semibold tracking-tight">Order received</h1>

    <p class="text-surface-600">
      We have your request. We will email you shortly to confirm availability
      and the amount, and to arrange payment. Nothing has been charged.
    </p>

    <p v-if="orderId" class="mt-4 text-sm text-surface-500">
      Reference: <code>{{ orderId }}</code>
    </p>

    <Button class="mt-8" label="Continue shopping" outlined @click="navigateTo('/')" />
  </section>
</template>
