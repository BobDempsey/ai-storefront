<script setup lang="ts">
import { formatMoney } from '~/utils/money'

defineProps<{
  priceCents: number
  originalPriceCents?: number
  salePercent: number
}>()
</script>

<template>
  <span v-if="originalPriceCents" class="inline-flex flex-wrap items-baseline gap-2">
    <span class="text-surface-400 line-through dark:text-surface-500">{{ formatMoney(originalPriceCents) }}</span>
    <span class="font-medium text-red-600 dark:text-red-400">{{ formatMoney(priceCents) }}</span>
    <Tag severity="danger" :value="`${salePercent}% off`" />
  </span>
  <span v-else>{{ formatMoney(priceCents) }}</span>
</template>
