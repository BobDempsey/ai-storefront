<script setup lang="ts">
import { messageFor } from '~/utils/errors'
const email = ref('')
const submitting = ref(false)
const subscribed = ref(false)
const errorMessage = ref('')

const { optinOffer } = useStoreSettings()

async function submit() {
  errorMessage.value = ''
  submitting.value = true

  try {
    await $fetch('/api/email-optin', { method: 'POST', body: { email: email.value } })
    // The server gives the same response for a new and a duplicate address,
    // so this confirmation is shown either way.
    subscribed.value = true
  } catch (error: unknown) {
    errorMessage.value = messageFor(error, 'Something went wrong. Please try again.')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="flex flex-col items-center gap-2">
    <p v-if="subscribed" class="text-sm">
      <i class="pi pi-check-circle mr-1 text-green-600" />
      <span v-if="optinOffer">You're subscribed. Check your inbox for your promo code.</span>
      <span v-else>You're subscribed.</span>
    </p>

    <form v-else class="flex flex-col items-center gap-2 sm:flex-row" @submit.prevent="submit">
      <label for="newsletter-email" class="sr-only">Email address</label>
      <InputText
        id="newsletter-email"
        v-model="email"
        type="email"
        required
        maxlength="200"
        autocomplete="email"
        placeholder="you@example.com"
        size="small"
      />
      <Button type="submit" label="Get updates" size="small" outlined :loading="submitting" />
    </form>

    <Message v-if="errorMessage" severity="error" size="small">{{ errorMessage }}</Message>
  </div>
</template>
