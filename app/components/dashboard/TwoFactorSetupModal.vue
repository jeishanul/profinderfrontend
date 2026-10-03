<script setup lang="ts">
import type { TwoFactorConfirmResult, TwoFactorSetup } from '#shared/types/auth'

// Auto-imported as <DashboardTwoFactorSetupModal/>. The "turn 2FA on" flow:
// confirm the account password (starting setup replaces any existing secret),
// fetch a fresh secret + QR code, verify one code from the person's
// authenticator app, then show one-time recovery codes. Each open starts a
// brand-new secret (see `TwoFactorController::setup`), so closing without
// confirming just discards that attempt — nothing is enabled until `confirm`
// succeeds.
const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
  enabled: []
}>()

const { t } = useI18n()
const titleId = useId()

type Step = 'password' | 'loading' | 'qr' | 'recovery-codes'
const step = ref<Step>('password')
const setup = ref<TwoFactorSetup | null>(null)
const password = ref('')
const code = ref('')
const error = ref('')
const submitting = ref(false)
const recoveryCodes = ref<string[]>([])
const toast = useToast()

async function startSetup() {
  if (!password.value) return
  step.value = 'loading'
  error.value = ''
  code.value = ''
  try {
    setup.value = await useApiFetch<TwoFactorSetup>('/api/dashboard/account/two-factor/setup', {
      method: 'POST',
      body: { password: password.value },
    })
    step.value = 'qr'
  }
  catch (e) {
    // Back to the password step with the reason, instead of hanging on "Setting up…" forever.
    step.value = 'password'
    error.value = apiFieldErrors(e).password ?? apiErrorMessage(e, t('ui.errors.generic'))
  }
  finally {
    password.value = ''
  }
}

watch(() => props.open, (isOpen) => {
  if (!isOpen) return
  step.value = 'password'
  password.value = ''
  error.value = ''
})

async function copyCodes() {
  try {
    await navigator.clipboard.writeText(recoveryCodes.value.join('\n'))
    toast.success(t('dashboard.settings.security.twoFactorSetup.copied'))
  }
  catch {
    toast.error(t('ui.errors.generic'))
  }
}

function downloadCodes() {
  const url = URL.createObjectURL(new Blob([recoveryCodes.value.join('\n')], { type: 'text/plain' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'profinder-recovery-codes.txt'
  link.click()
  URL.revokeObjectURL(url)
}

async function submitCode() {
  if (code.value.length < 6) return
  submitting.value = true
  error.value = ''
  try {
    const result = await useApiFetch<TwoFactorConfirmResult>('/api/dashboard/account/two-factor/confirm', {
      method: 'POST',
      body: { code: code.value },
    })
    recoveryCodes.value = result.recoveryCodes
    step.value = 'recovery-codes'
  }
  catch (e) {
    error.value = apiErrorStatus(e) === 422 ? t('dashboard.settings.security.twoFactorSetup.invalidCode') : apiErrorMessage(e, t('ui.errors.generic'))
  }
  finally {
    submitting.value = false
  }
}

function finish() {
  emit('enabled')
  emit('close')
}

// Two-factor is already switched on once the code was confirmed, so closing from the
// recovery-codes step by any route (X, backdrop, Escape) must refresh the toggle too —
// not only the "Done" button.
function handleClose() {
  if (step.value === 'recovery-codes') finish()
  else emit('close')
}
</script>

<template>
  <UiModal
    :open="open"
    :labelledby="titleId"
    @close="handleClose"
  >
    <template v-if="step === 'password'">
      <h2
        :id="titleId"
        class="mb-2 font-display text-xl font-bold"
      >
        {{ t('dashboard.settings.security.twoFactorSetup.passwordHeading') }}
      </h2>
      <p class="mb-4 text-sm text-black/60 dark:text-white/60">
        {{ t('dashboard.settings.security.twoFactorSetup.passwordBody') }}
      </p>
      <form
        class="flex flex-col gap-3"
        @submit.prevent="startSetup"
      >
        <UiInput
          v-model="password"
          type="password"
          autocomplete="current-password"
          :placeholder="t('dashboard.settings.security.currentPasswordLabel')"
        />
        <p
          v-if="error"
          class="text-xs font-semibold text-red-600 dark:text-red-400"
        >
          {{ error }}
        </p>
        <div class="flex justify-end gap-2.5">
          <UiButton
            type="button"
            variant="ghost"
            @click="emit('close')"
          >
            {{ t('dashboard.services.form.cancel') }}
          </UiButton>
          <UiButton
            type="submit"
            variant="primary"
            :disabled="!password"
          >
            {{ t('dashboard.settings.security.twoFactorSetup.continue') }}
          </UiButton>
        </div>
      </form>
    </template>

    <p
      v-else-if="step === 'loading'"
      class="py-8 text-center text-sm text-black/50 dark:text-white/50"
    >
      {{ t('dashboard.settings.security.twoFactorSetup.loading') }}
    </p>

    <template v-else-if="step === 'qr'">
      <h2
        :id="titleId"
        class="mb-2 font-display text-xl font-bold"
      >
        {{ t('dashboard.settings.security.twoFactorSetup.heading') }}
      </h2>
      <p class="mb-4 text-sm text-black/60 dark:text-white/60">
        {{ t('dashboard.settings.security.twoFactorSetup.body') }}
      </p>
      <!-- eslint-disable vue/no-v-html -- server-generated SVG from our own trusted TwoFactorController, not user input -->
      <div
        class="mb-4 flex justify-center rounded-xl border border-black/10 bg-white p-3 dark:border-white/10"
        v-html="setup?.qrCodeSvg"
      />
      <!-- eslint-enable vue/no-v-html -->
      <p class="mb-4 text-center text-xs text-black/50 dark:text-white/50">
        {{ t('dashboard.settings.security.twoFactorSetup.manualEntry') }}
        <code class="font-mono font-semibold text-black dark:text-white">{{ setup?.secret }}</code>
      </p>
      <form
        class="flex flex-col gap-3"
        @submit.prevent="submitCode"
      >
        <UiInput
          v-model="code"
          autocomplete="one-time-code"
          :placeholder="t('auth.twoFactor.codePlaceholder')"
        />
        <p
          v-if="error"
          class="text-xs font-semibold text-red-600 dark:text-red-400"
        >
          {{ error }}
        </p>
        <div class="flex justify-end gap-2.5">
          <UiButton
            type="button"
            variant="ghost"
            @click="emit('close')"
          >
            {{ t('dashboard.services.form.cancel') }}
          </UiButton>
          <UiButton
            type="submit"
            variant="primary"
            :disabled="code.length < 6 || submitting"
          >
            {{ t('dashboard.settings.security.twoFactorSetup.verify') }}
          </UiButton>
        </div>
      </form>
    </template>

    <template v-else-if="step === 'recovery-codes'">
      <h2
        :id="titleId"
        class="mb-2 font-display text-xl font-bold"
      >
        {{ t('dashboard.settings.security.twoFactorSetup.recoveryHeading') }}
      </h2>
      <p class="mb-4 text-sm text-black/60 dark:text-white/60">
        {{ t('dashboard.settings.security.twoFactorSetup.recoveryBody') }}
      </p>
      <div class="mb-4 grid grid-cols-2 gap-2 rounded-xl border border-black/10 bg-black/5 p-4 font-mono text-sm dark:border-white/10 dark:bg-white/5">
        <span
          v-for="recoveryCode in recoveryCodes"
          :key="recoveryCode"
        >{{ recoveryCode }}</span>
      </div>
      <div class="mb-3 flex gap-2">
        <UiButton
          variant="ghost"
          size="sm"
          class="flex-1 justify-center"
          @click="copyCodes"
        >
          {{ t('dashboard.settings.security.twoFactorSetup.copy') }}
        </UiButton>
        <UiButton
          variant="ghost"
          size="sm"
          class="flex-1 justify-center"
          @click="downloadCodes"
        >
          {{ t('dashboard.settings.security.twoFactorSetup.download') }}
        </UiButton>
      </div>
      <UiButton
        class="w-full justify-center"
        @click="finish"
      >
        {{ t('dashboard.settings.security.twoFactorSetup.done') }}
      </UiButton>
    </template>
  </UiModal>
</template>
