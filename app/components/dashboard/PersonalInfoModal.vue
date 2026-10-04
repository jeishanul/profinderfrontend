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
const session = useSession()
const { uploadImage } = useImageUpload()

const fullName = ref('')
const phone = ref('')
const email = ref('')
const authModal = useAuthModal()
const errors = ref<Record<string, string>>({})
const isSaving = ref(false)
const avatarInput = useTemplateRef('avatarInput')
const isUploadingAvatar = ref(false)

// Re-seed from the latest account data each time the modal opens, so a
// cancelled edit never leaks into the next open.
watch(() => props.open, (isOpen) => {
  if (!isOpen) return
  fullName.value = props.account.fullName
  phone.value = props.account.phone ?? ''
  email.value = props.account.email
  errors.value = {}
})

async function onAvatarChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  isUploadingAvatar.value = true
  try {
    const result = await uploadImage<{ url: string }>('/api/dashboard/profile/avatar', file)
    // Header/menus read the avatar from the session user.
    if (result) await session.fetchUser()
  }
  finally {
    isUploadingAvatar.value = false
  }
}

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
    // The server already mailed a code for the new address (`AccountController::update`) —
    // just open the verify step, don't call `verification.start()` (it would send a second
    // code, invalidating the first and burning the send-rate limit).
    if (emailChanged) authModal.open('verify-email')
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
      <div class="flex flex-col items-center gap-2.5">
        <UiAvatar
          :name="session.name.value"
          :src="session.user.value?.avatarUrl"
          size-class="h-20 w-20 rounded-full"
          text-class="text-2xl"
        />
        <UiButton
          type="button"
          variant="ghost"
          size="sm"
          :disabled="isUploadingAvatar"
          @click="avatarInput?.click()"
        >
          <UiIcon
            name="camera"
            :size="14"
          />{{ t('dashboard.profile.changePhoto') }}
        </UiButton>
        <input
          ref="avatarInput"
          type="file"
          accept="image/*"
          class="hidden"
          :aria-label="t('dashboard.profile.changePhoto')"
          @change="onAvatarChange"
        >
      </div>
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
