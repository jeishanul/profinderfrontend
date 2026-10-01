<script setup lang="ts">
import type { AccountSettings } from '#shared/types/dashboard'

// Auto-imported as <DashboardPersonalInfoModal/>. Name + phone editing for
// everyone. Consumers have no provider profile (and no /profile page), so
// this used to be impossible for them — the only editor was the provider one.
const props = defineProps<{
  open: boolean
  account: AccountSettings
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const { t } = useI18n()
const toast = useToast()

const fullName = ref('')
const phone = ref('')
const email = ref('')
const verification = useEmailVerification()
const errors = ref<Record<string, string>>({})
const isSaving = ref(false)

// Re-seed from the latest account data each time the modal opens, so a
// cancelled edit never leaks into the next open.
watch(() => props.open, (isOpen) => {
  if (!isOpen) return
  fullName.value = props.account.fullName
  phone.value = props.account.phone ?? ''
  email.value = props.account.email
  errors.value = {}
})

async function submit() {
  if (!fullName.value.trim()) {
    errors.value = { fullName: t('dashboard.settings.account.nameRequired') }
    return
  }
  isSaving.value = true
  errors.value = {}
  try {
    const emailChanged = email.value.trim().toLowerCase() !== props.account.email.toLowerCase()
    await useApiFetch('/api/dashboard/account', {
      method: 'PUT',
      body: {
        fullName: fullName.value.trim(),
        phone: phone.value.trim() || null,
        // A new address has to be confirmed again; the server mails the code.
        ...(emailChanged ? { email: email.value.trim() } : {}),
      },
    })
    // The header/menus show the name and initials from the session user.
    await useSession().fetchUser()
    toast.success(t('dashboard.settings.account.saved'))
    emit('saved')
    emit('close')
    if (emailChanged) await verification.start()
  }
  catch (error) {
    errors.value = apiFieldErrors(error)
    if (Object.keys(errors.value).length === 0) toast.error(apiErrorMessage(error, t('ui.errors.generic')))
  }
  finally {
    isSaving.value = false
  }
}
</script>

<template>
  <UiModal
    :open="open"
    labelledby="personal-info-title"
    @close="emit('close')"
  >
    <h2
      id="personal-info-title"
      class="mb-5 font-display text-xl font-bold"
    >
      {{ t('dashboard.settings.account.personalInfoTitle') }}
    </h2>
    <form
      class="flex flex-col gap-4"
      @submit.prevent="submit"
    >
      <div>
        <label
          for="personal-full-name"
          class="mb-1.5 block text-xs font-bold"
        >{{ t('dashboard.settings.account.fullName') }}</label>
        <UiInput
          id="personal-full-name"
          v-model="fullName"
          autocomplete="name"
        />
        <p
          v-if="errors.fullName"
          class="mt-1.5 text-xs text-red-600 dark:text-red-400"
        >
          {{ errors.fullName }}
        </p>
      </div>
      <div>
        <label
          for="personal-phone"
          class="mb-1.5 block text-xs font-bold"
        >{{ t('dashboard.settings.account.phone') }}</label>
        <UiInput
          id="personal-phone"
          v-model="phone"
          type="tel"
          autocomplete="tel"
        />
        <p
          v-if="errors.phone"
          class="mt-1.5 text-xs text-red-600 dark:text-red-400"
        >
          {{ errors.phone }}
        </p>
      </div>
      <div>
        <label
          for="personal-email"
          class="mb-1.5 block text-xs font-bold"
        >{{ t('dashboard.settings.account.email') }}</label>
        <UiInput
          id="personal-email"
          v-model="email"
          type="email"
          autocomplete="email"
        />
        <p
          v-if="errors.email"
          class="mt-1.5 text-xs text-red-600 dark:text-red-400"
        >
          {{ errors.email }}
        </p>
        <p class="mt-1.5 text-xs text-black/50 dark:text-white/50">
          {{ t('dashboard.settings.account.emailChangeHelp') }}
        </p>
      </div>
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
          :disabled="isSaving"
        >
          {{ t('dashboard.profile.save') }}
        </UiButton>
      </div>
    </form>
  </UiModal>
</template>
