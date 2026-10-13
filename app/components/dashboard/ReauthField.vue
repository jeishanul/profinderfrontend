<script setup lang="ts">
// Auto-imported as <DashboardReauthField/>. "Confirm it's you": the account password, or — for an account created by
// social sign-in, which has none — a one-time code emailed on request.
defineProps<{
  hasPassword: boolean
  id: string
}>()

const value = defineModel<string>({ required: true })

const { t } = useI18n()
const toast = useToast()
const sending = ref(false)
const sent = ref(false)

async function sendCode() {
  sending.value = true
  try {
    await useApiFetch('/api/dashboard/account/reauth-code', { method: 'POST' })
    sent.value = true
    toast.success(t('dashboard.settings.security.reauth.sent'))
  }
  catch (error) {
    toast.error(apiErrorMessage(error, t('ui.errors.generic')))
  }
  finally {
    sending.value = false
  }
}
</script>

<template>
  <div>
    <label
      :for="id"
      class="mb-1.5 block text-xs font-bold"
    >
      {{ hasPassword ? t('dashboard.settings.security.currentPasswordLabel') : t('dashboard.settings.security.reauth.codeLabel') }}
    </label>
    <UiInput
      :id="id"
      v-model="value"
      :type="hasPassword ? 'password' : 'text'"
      :inputmode="hasPassword ? undefined : 'numeric'"
      :autocomplete="hasPassword ? 'current-password' : 'one-time-code'"
    />
    <div
      v-if="!hasPassword"
      class="mt-2 flex items-center justify-between gap-3 text-xs text-black/50 dark:text-white/50"
    >
      <span>{{ sent ? t('dashboard.settings.security.reauth.sentHint') : t('dashboard.settings.security.reauth.hint') }}</span>
      <UiButton
        type="button"
        variant="ghost"
        size="sm"
        :disabled="sending"
        @click="sendCode"
      >
        {{ sent ? t('dashboard.settings.security.reauth.resend') : t('dashboard.settings.security.reauth.send') }}
      </UiButton>
    </div>
  </div>
</template>
