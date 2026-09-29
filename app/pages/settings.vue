<script setup lang="ts">
import type { AccountSettings } from '#shared/types/dashboard'

// Reached from Home's quick tiles or the More sheet, never a bottom-nav tab
// — mobile gets a back button instead of the tab bar (see `UiBackButton`).
definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
  hideBottomNav: true,
})

const { t } = useI18n()
const session = useSession()
const localePath = useLocalePath()

const { data: account, refresh: refreshAccount } = await useApi<AccountSettings>('/dashboard/account', {
  key: 'dashboard-account',
})

const bookingRequests = ref(true)
const messages = ref(true)
const marketing = ref(false)

watch(account, (value) => {
  if (!value) return
  bookingRequests.value = value.notificationPreferences.bookingRequests
  messages.value = value.notificationPreferences.messages
  marketing.value = value.notificationPreferences.marketing
}, { immediate: true })

// --- Two-factor authentication — turning it on opens the QR-code setup flow
// (<DashboardTwoFactorSetupModal/>); turning it off asks for the current
// password first, since removing a security control shouldn't be a single
// accidental click.

const isTwoFactorSetupOpen = ref(false)
const isTwoFactorDisableOpen = ref(false)
const disablePassword = ref('')
const disableError = ref('')
const disableSubmitting = ref(false)

function onToggleTwoFactor(next: boolean) {
  if (next) isTwoFactorSetupOpen.value = true
  else {
    disablePassword.value = ''
    disableError.value = ''
    isTwoFactorDisableOpen.value = true
  }
}

async function confirmDisableTwoFactor() {
  if (!disablePassword.value) return
  disableSubmitting.value = true
  disableError.value = ''
  try {
    await useApiFetch('/api/dashboard/account/two-factor', {
      method: 'DELETE',
      body: { currentPassword: disablePassword.value },
    })
    isTwoFactorDisableOpen.value = false
    await refreshAccount()
  }
  catch {
    disableError.value = t('dashboard.settings.security.currentPasswordError')
  }
  finally {
    disableSubmitting.value = false
  }
}

// Notification toggles auto-save on change — there's no separate "save" step
// in this section's UI, so each flip is its own PUT.
watch([bookingRequests, messages, marketing], ([bookingRequestsValue, messagesValue, marketingValue]) => {
  if (!account.value) return
  useApiFetch('/api/dashboard/account', {
    method: 'PUT',
    body: {
      notificationPreferences: {
        bookingRequests: bookingRequestsValue,
        messages: messagesValue,
        marketing: marketingValue,
      },
    },
  })
})

const isPasswordModalOpen = ref(false)
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const passwordJustChanged = ref(false)
const passwordError = ref('')

const canChangePassword = computed(() => currentPassword.value.length > 0 && newPassword.value.length >= 8 && newPassword.value === confirmPassword.value)

function openChangePassword() {
  currentPassword.value = ''
  newPassword.value = ''
  confirmPassword.value = ''
  passwordError.value = ''
  isPasswordModalOpen.value = true
}

async function submitChangePassword() {
  if (!canChangePassword.value) return
  passwordError.value = ''
  try {
    await useApiFetch('/api/dashboard/account/password', {
      method: 'PUT',
      body: { currentPassword: currentPassword.value, password: newPassword.value },
    })
    isPasswordModalOpen.value = false
    passwordJustChanged.value = true
    setTimeout(() => (passwordJustChanged.value = false), 2500)
  }
  catch {
    passwordError.value = t('dashboard.settings.security.currentPasswordError')
  }
}

// --- Deactivate / delete account — destructive, so both are gated behind a
// confirmation dialog rather than firing on a single click. Deactivate just
// flips `status` to suspended (an admin can restore it); delete requires the
// current password and soft-deletes the account (see `AccountController`).

const dangerAction = ref<'deactivate' | 'delete' | null>(null)
const dangerPassword = ref('')
const dangerError = ref('')
const dangerSubmitting = ref(false)

function openDangerAction(action: 'deactivate' | 'delete') {
  dangerAction.value = action
  dangerPassword.value = ''
  dangerError.value = ''
}

async function confirmDangerAction() {
  if (dangerAction.value === 'delete' && !dangerPassword.value) return

  dangerSubmitting.value = true
  dangerError.value = ''
  try {
    if (dangerAction.value === 'deactivate') {
      await useApiFetch('/api/dashboard/account/deactivate', { method: 'POST' })
    }
    else {
      await useApiFetch('/api/dashboard/account', {
        method: 'DELETE',
        body: { currentPassword: dangerPassword.value },
      })
    }
    dangerAction.value = null
    // The token was already revoked server-side by deactivate/delete — this
    // just clears the now-stale httpOnly cookie (see `server/api/auth/logout.post.ts`,
    // which clears it even if the backend call itself 401s).
    await session.logout()
    await navigateTo(localePath('/'))
  }
  catch {
    dangerError.value = dangerAction.value === 'delete'
      ? t('dashboard.settings.security.currentPasswordError')
      : t('errors.somethingWrong')
  }
  finally {
    dangerSubmitting.value = false
  }
}

useSeoMeta({
  title: t('dashboard.settings.title'),
})
</script>

<template>
  <div class="flex max-w-2xl flex-col gap-6">
    <UiBackButton fallback="/" />
    <div>
      <h1 class="font-display text-2xl font-bold">
        {{ t('dashboard.settings.title') }}
      </h1>
      <p class="mt-0.5 text-sm text-black/60 dark:text-white/60">
        {{ t('dashboard.settings.subtitle') }}
      </p>
    </div>

    <template v-if="account">
      <!-- Mobile: one flat grouped list (native Settings-app pattern) instead
           of five always-expanded cards — each row is tappable/toggleable in
           place, sections are captions rather than separate boxed cards (see
           CLAUDE.md's mobile-first redesign notes). The desktop cards below
           (`hidden sm:contents`) take over unchanged from `sm` up; `contents`
           keeps the five `<section>`s as direct flex children of the root so
           the original `gap-6` spacing between them is untouched. -->
      <div class="flex flex-col sm:hidden">
        <p class="mb-2 px-1 text-[11px] font-bold tracking-wide text-black/40 uppercase dark:text-white/40">
          {{ t('dashboard.settings.account.heading') }}
        </p>
        <div class="mb-5 rounded-2xl border border-black/10 dark:border-white/10">
          <NuxtLinkLocale
            to="/profile"
            class="flex items-center gap-3 px-4 py-3.5"
          >
            <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/5 text-black/70 dark:bg-white/10 dark:text-white/70">
              <UiIcon
                name="user"
                :size="17"
              />
            </span>
            <span class="min-w-0 flex-1">
              <span class="block truncate text-[13.5px] font-semibold">{{ account.fullName }}</span>
              <span class="block truncate text-xs text-black/50 dark:text-white/50">{{ account.email }}</span>
            </span>
            <UiIcon
              name="chevron-left"
              :size="16"
              class="shrink-0 rotate-180 text-black/30 dark:text-white/30"
            />
          </NuxtLinkLocale>
        </div>

        <p class="mb-2 px-1 text-[11px] font-bold tracking-wide text-black/40 uppercase dark:text-white/40">
          {{ t('dashboard.settings.security.heading') }}
        </p>
        <div class="mb-5 flex flex-col rounded-2xl border border-black/10 dark:border-white/10">
          <button
            type="button"
            class="flex items-center gap-3 border-b border-black/10 px-4 py-3.5 text-left dark:border-white/10"
            @click="openChangePassword"
          >
            <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/5 text-black/70 dark:bg-white/10 dark:text-white/70">
              <UiIcon
                name="lock"
                :size="16"
              />
            </span>
            <span class="min-w-0 flex-1">
              <span class="block text-[13.5px] font-semibold">{{ t('dashboard.settings.security.password') }}</span>
              <span
                v-if="passwordJustChanged"
                class="flex items-center gap-1 text-xs font-semibold text-brand-700 dark:text-brand-100"
              >
                <UiIcon
                  name="check"
                  :size="11"
                />{{ t('dashboard.settings.security.passwordUpdated') }}
              </span>
              <span
                v-else
                class="block truncate text-xs text-black/50 dark:text-white/50"
              >{{ t('dashboard.settings.security.passwordChanged', { time: account.passwordChangedLabel }) }}</span>
            </span>
            <UiIcon
              name="chevron-left"
              :size="16"
              class="shrink-0 rotate-180 text-black/30 dark:text-white/30"
            />
          </button>
          <div class="flex items-center gap-3 px-4 py-3.5">
            <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/5 text-black/70 dark:bg-white/10 dark:text-white/70">
              <UiIcon
                name="shield-check"
                :size="16"
              />
            </span>
            <span class="min-w-0 flex-1 text-[13.5px] font-semibold">{{ t('dashboard.settings.security.twoFa') }}</span>
            <UiToggleSwitch
              :model-value="account.twoFactorEnabled"
              :label="t('dashboard.settings.security.twoFa')"
              @update:model-value="onToggleTwoFactor"
            />
          </div>
        </div>

        <p class="mb-2 px-1 text-[11px] font-bold tracking-wide text-black/40 uppercase dark:text-white/40">
          {{ t('dashboard.settings.notifications.heading') }}
        </p>
        <div class="mb-5 flex flex-col rounded-2xl border border-black/10 dark:border-white/10">
          <div class="flex items-center gap-3 border-b border-black/10 px-4 py-3.5 dark:border-white/10">
            <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700 dark:bg-brand-700/20 dark:text-brand-100">
              <UiIcon
                name="briefcase"
                :size="16"
              />
            </span>
            <span class="min-w-0 flex-1 text-[13.5px] font-semibold">{{ t('dashboard.settings.notifications.bookingRequests') }}</span>
            <UiToggleSwitch
              v-model="bookingRequests"
              :label="t('dashboard.settings.notifications.bookingRequests')"
            />
          </div>
          <div class="flex items-center gap-3 border-b border-black/10 px-4 py-3.5 dark:border-white/10">
            <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/5 text-black/70 dark:bg-white/10 dark:text-white/70">
              <UiIcon
                name="message"
                :size="16"
              />
            </span>
            <span class="min-w-0 flex-1 text-[13.5px] font-semibold">{{ t('dashboard.settings.notifications.messages') }}</span>
            <UiToggleSwitch
              v-model="messages"
              :label="t('dashboard.settings.notifications.messages')"
            />
          </div>
          <div class="flex items-center gap-3 px-4 py-3.5">
            <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-50 text-accent-700 dark:bg-accent-700/20 dark:text-accent-100">
              <UiIcon
                name="mail"
                :size="16"
              />
            </span>
            <span class="min-w-0 flex-1 text-[13.5px] font-semibold">{{ t('dashboard.settings.notifications.marketing') }}</span>
            <UiToggleSwitch
              v-model="marketing"
              :label="t('dashboard.settings.notifications.marketing')"
            />
          </div>
        </div>

        <p class="mb-2 px-1 text-[11px] font-bold tracking-wide text-black/40 uppercase dark:text-white/40">
          {{ t('dashboard.settings.language.heading') }}
        </p>
        <div class="mb-5 rounded-2xl border border-black/10 dark:border-white/10">
          <div class="flex items-center gap-3 px-4 py-3.5">
            <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/5 text-black/70 dark:bg-white/10 dark:text-white/70">
              <UiIcon
                name="globe"
                :size="16"
              />
            </span>
            <span class="min-w-0 flex-1">
              <span class="block text-[13.5px] font-semibold">{{ t('dashboard.settings.language.heading') }}</span>
              <span class="block text-xs text-black/50 dark:text-white/50">English (United States)</span>
            </span>
            <UiLocaleSwitcher />
          </div>
        </div>

        <p class="mb-2 px-1 text-[11px] font-bold tracking-wide text-red-700/70 uppercase dark:text-red-300/70">
          {{ t('dashboard.settings.danger.heading') }}
        </p>
        <div class="flex flex-col rounded-2xl border border-red-600/30">
          <button
            type="button"
            class="flex items-center gap-3 border-b border-red-600/15 px-4 py-3.5 text-left"
            @click="openDangerAction('deactivate')"
          >
            <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300">
              <UiIcon
                name="alert-triangle"
                :size="16"
              />
            </span>
            <span class="min-w-0 flex-1 text-[13.5px] font-semibold text-red-700 dark:text-red-300">{{ t('dashboard.settings.danger.deactivate') }}</span>
            <UiIcon
              name="chevron-left"
              :size="16"
              class="shrink-0 rotate-180 text-red-700/40 dark:text-red-300/40"
            />
          </button>
          <button
            type="button"
            class="flex items-center gap-3 px-4 py-3.5 text-left"
            @click="openDangerAction('delete')"
          >
            <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300">
              <UiIcon
                name="trash"
                :size="16"
              />
            </span>
            <span class="min-w-0 flex-1 text-[13.5px] font-semibold text-red-700 dark:text-red-300">{{ t('dashboard.settings.danger.delete') }}</span>
            <UiIcon
              name="chevron-left"
              :size="16"
              class="shrink-0 rotate-180 text-red-700/40 dark:text-red-300/40"
            />
          </button>
        </div>
      </div>

      <div class="hidden sm:contents">
        <section class="rounded-2xl border border-black/10 p-5 sm:p-6 dark:border-white/10">
          <div class="mb-1 flex items-center justify-between gap-4">
            <h2 class="font-display text-[15px] font-bold">
              {{ t('dashboard.settings.account.heading') }}
            </h2>
            <NuxtLinkLocale
              to="/profile"
              :class="linkButtonClass('ghost', 'sm')"
            >
              {{ t('dashboard.settings.account.editProfile') }}
            </NuxtLinkLocale>
          </div>
          <p class="mb-3.5 text-xs text-black/50 dark:text-white/50">
            {{ t('dashboard.settings.account.editHint') }}
          </p>
          <div class="flex flex-col gap-3.5 py-1">
            <div>
              <div class="text-[13.5px] font-semibold">
                {{ t('dashboard.settings.account.fullName') }}
              </div>
              <div class="mt-0.5 text-[13px] text-black/60 dark:text-white/60">
                {{ account.fullName }}
              </div>
            </div>
            <div>
              <div class="text-[13.5px] font-semibold">
                {{ t('dashboard.settings.account.email') }}
              </div>
              <div class="mt-0.5 text-[13px] text-black/60 dark:text-white/60">
                {{ account.email }}
              </div>
            </div>
            <div>
              <div class="text-[13.5px] font-semibold">
                {{ t('dashboard.settings.account.phone') }}
              </div>
              <div class="mt-0.5 text-[13px] text-black/60 dark:text-white/60">
                {{ account.phone }}
              </div>
            </div>
          </div>
        </section>

        <section class="rounded-2xl border border-black/10 p-5 sm:p-6 dark:border-white/10">
          <h2 class="mb-1 font-display text-[15px] font-bold">
            {{ t('dashboard.settings.security.heading') }}
          </h2>
          <div class="flex items-center justify-between gap-4 border-b border-black/10 py-3.5 dark:border-white/10">
            <div>
              <div class="text-[13.5px] font-semibold">
                {{ t('dashboard.settings.security.password') }}
              </div>
              <div class="mt-0.5 text-[13px] text-black/60 dark:text-white/60">
                <span
                  v-if="passwordJustChanged"
                  class="inline-flex items-center gap-1 font-semibold text-brand-700 dark:text-brand-100"
                >
                  <UiIcon
                    name="check"
                    :size="12"
                  />{{ t('dashboard.settings.security.passwordUpdated') }}
                </span>
                <template v-else>
                  {{ t('dashboard.settings.security.passwordChanged', { time: account.passwordChangedLabel }) }}
                </template>
              </div>
            </div>
            <UiButton
              variant="ghost"
              size="sm"
              @click="openChangePassword"
            >
              {{ t('dashboard.settings.security.changePassword') }}
            </UiButton>
          </div>
          <div class="flex items-center justify-between gap-4 py-3.5">
            <div>
              <div class="text-[13.5px] font-semibold">
                {{ t('dashboard.settings.security.twoFa') }}
              </div>
              <div class="mt-0.5 text-[13px] text-black/60 dark:text-white/60">
                {{ t('dashboard.settings.security.twoFaBody') }}
              </div>
            </div>
            <UiToggleSwitch
              :model-value="account.twoFactorEnabled"
              :label="t('dashboard.settings.security.twoFa')"
              @update:model-value="onToggleTwoFactor"
            />
          </div>
        </section>

        <section class="rounded-2xl border border-black/10 p-5 sm:p-6 dark:border-white/10">
          <h2 class="mb-1 font-display text-[15px] font-bold">
            {{ t('dashboard.settings.notifications.heading') }}
          </h2>
          <div class="flex items-center justify-between gap-4 border-b border-black/10 py-3.5 dark:border-white/10">
            <div class="text-[13.5px] font-semibold">
              {{ t('dashboard.settings.notifications.bookingRequests') }}
            </div>
            <UiToggleSwitch
              v-model="bookingRequests"
              :label="t('dashboard.settings.notifications.bookingRequests')"
            />
          </div>
          <div class="flex items-center justify-between gap-4 border-b border-black/10 py-3.5 dark:border-white/10">
            <div class="text-[13.5px] font-semibold">
              {{ t('dashboard.settings.notifications.messages') }}
            </div>
            <UiToggleSwitch
              v-model="messages"
              :label="t('dashboard.settings.notifications.messages')"
            />
          </div>
          <div class="flex items-center justify-between gap-4 py-3.5">
            <div class="text-[13.5px] font-semibold">
              {{ t('dashboard.settings.notifications.marketing') }}
            </div>
            <UiToggleSwitch
              v-model="marketing"
              :label="t('dashboard.settings.notifications.marketing')"
            />
          </div>
        </section>

        <section class="rounded-2xl border border-black/10 p-5 sm:p-6 dark:border-white/10">
          <h2 class="mb-1 font-display text-[15px] font-bold">
            {{ t('dashboard.settings.language.heading') }}
          </h2>
          <div class="flex items-center justify-between gap-4 py-3.5">
            <div>
              <div class="text-[13.5px] font-semibold">
                {{ t('dashboard.settings.language.current') }}
              </div>
              <div class="mt-0.5 text-[13px] text-black/60 dark:text-white/60">
                English (United States)
              </div>
            </div>
            <UiLocaleSwitcher />
          </div>
        </section>

        <section class="rounded-2xl border border-red-600/30 p-5 sm:p-6">
          <h2 class="mb-1 font-display text-[15px] font-bold text-red-700 dark:text-red-300">
            {{ t('dashboard.settings.danger.heading') }}
          </h2>
          <div class="flex items-center justify-between gap-4 border-b border-black/10 py-3.5 dark:border-white/10">
            <div>
              <div class="text-[13.5px] font-semibold">
                {{ t('dashboard.settings.danger.deactivate') }}
              </div>
              <div class="mt-0.5 text-[13px] text-black/60 dark:text-white/60">
                {{ t('dashboard.settings.danger.deactivateBody') }}
              </div>
            </div>
            <button
              type="button"
              class="rounded-md border border-red-600/40 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-900/20"
              @click="openDangerAction('deactivate')"
            >
              {{ t('dashboard.settings.danger.deactivate') }}
            </button>
          </div>
          <div class="flex items-center justify-between gap-4 py-3.5">
            <div>
              <div class="text-[13.5px] font-semibold">
                {{ t('dashboard.settings.danger.delete') }}
              </div>
              <div class="mt-0.5 text-[13px] text-black/60 dark:text-white/60">
                {{ t('dashboard.settings.danger.deleteBody') }}
              </div>
            </div>
            <button
              type="button"
              class="rounded-md border border-red-600/40 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-900/20"
              @click="openDangerAction('delete')"
            >
              {{ t('dashboard.settings.danger.delete') }}
            </button>
          </div>
        </section>
      </div>
    </template>

    <UiModal
      :open="isPasswordModalOpen"
      @close="isPasswordModalOpen = false"
    >
      <h2 class="mb-5 font-display text-xl font-bold">
        {{ t('dashboard.settings.security.changePassword') }}
      </h2>
      <form
        class="flex flex-col gap-4"
        @submit.prevent="submitChangePassword"
      >
        <p
          v-if="passwordError"
          class="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 dark:bg-red-900/20 dark:text-red-300"
        >
          {{ passwordError }}
        </p>
        <div>
          <label
            for="settings-current-password"
            class="mb-1.5 block text-xs font-bold"
          >{{ t('dashboard.settings.security.currentPasswordLabel') }}</label>
          <UiInput
            id="settings-current-password"
            v-model="currentPassword"
            type="password"
          />
        </div>
        <div>
          <label
            for="settings-new-password"
            class="mb-1.5 block text-xs font-bold"
          >{{ t('dashboard.settings.security.newPasswordLabel') }}</label>
          <UiInput
            id="settings-new-password"
            v-model="newPassword"
            type="password"
          />
        </div>
        <div>
          <label
            for="settings-confirm-password"
            class="mb-1.5 block text-xs font-bold"
          >{{ t('dashboard.settings.security.confirmPasswordLabel') }}</label>
          <UiInput
            id="settings-confirm-password"
            v-model="confirmPassword"
            type="password"
          />
        </div>
        <div class="mt-1 flex justify-end gap-2.5">
          <UiButton
            type="button"
            variant="ghost"
            @click="isPasswordModalOpen = false"
          >
            {{ t('dashboard.services.form.cancel') }}
          </UiButton>
          <UiButton
            type="submit"
            variant="primary"
            :disabled="!canChangePassword"
          >
            {{ t('dashboard.settings.security.updatePassword') }}
          </UiButton>
        </div>
      </form>
    </UiModal>

    <UiModal
      :open="dangerAction !== null"
      @close="dangerAction = null"
    >
      <h2 class="mb-2 font-display text-xl font-bold">
        {{ dangerAction === 'delete' ? t('dashboard.settings.danger.confirmDeleteTitle') : t('dashboard.settings.danger.confirmDeactivateTitle') }}
      </h2>
      <p class="mb-5 text-sm text-black/60 dark:text-white/60">
        {{ dangerAction === 'delete' ? t('dashboard.settings.danger.confirmDeleteBody') : t('dashboard.settings.danger.confirmDeactivateBody') }}
      </p>
      <div
        v-if="dangerAction === 'delete'"
        class="mb-4"
      >
        <label
          for="danger-password"
          class="mb-1.5 block text-xs font-bold"
        >{{ t('dashboard.settings.security.currentPasswordLabel') }}</label>
        <UiInput
          id="danger-password"
          v-model="dangerPassword"
          type="password"
        />
      </div>
      <p
        v-if="dangerError"
        class="mb-4 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 dark:bg-red-900/20 dark:text-red-300"
      >
        {{ dangerError }}
      </p>
      <div class="flex justify-end gap-2.5">
        <UiButton
          variant="ghost"
          @click="dangerAction = null"
        >
          {{ t('dashboard.services.form.cancel') }}
        </UiButton>
        <UiButton
          class="bg-red-600! hover:bg-red-700!"
          :disabled="dangerSubmitting || (dangerAction === 'delete' && !dangerPassword)"
          @click="confirmDangerAction"
        >
          {{ dangerAction === 'delete' ? t('dashboard.settings.danger.delete') : t('dashboard.settings.danger.deactivate') }}
        </UiButton>
      </div>
    </UiModal>

    <DashboardTwoFactorSetupModal
      :open="isTwoFactorSetupOpen"
      @close="isTwoFactorSetupOpen = false"
      @enabled="refreshAccount"
    />

    <UiModal
      :open="isTwoFactorDisableOpen"
      @close="isTwoFactorDisableOpen = false"
    >
      <h2 class="mb-2 font-display text-xl font-bold">
        {{ t('dashboard.settings.security.twoFactorDisable.heading') }}
      </h2>
      <p class="mb-5 text-sm text-black/60 dark:text-white/60">
        {{ t('dashboard.settings.security.twoFactorDisable.body') }}
      </p>
      <form
        class="flex flex-col gap-4"
        @submit.prevent="confirmDisableTwoFactor"
      >
        <div>
          <label
            for="disable-two-factor-password"
            class="mb-1.5 block text-xs font-bold"
          >{{ t('dashboard.settings.security.currentPasswordLabel') }}</label>
          <UiInput
            id="disable-two-factor-password"
            v-model="disablePassword"
            type="password"
          />
        </div>
        <p
          v-if="disableError"
          class="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 dark:bg-red-900/20 dark:text-red-300"
        >
          {{ disableError }}
        </p>
        <div class="flex justify-end gap-2.5">
          <UiButton
            type="button"
            variant="ghost"
            @click="isTwoFactorDisableOpen = false"
          >
            {{ t('dashboard.services.form.cancel') }}
          </UiButton>
          <UiButton
            type="submit"
            class="bg-red-600! hover:bg-red-700!"
            :disabled="!disablePassword || disableSubmitting"
          >
            {{ t('dashboard.settings.security.twoFactorDisable.confirm') }}
          </UiButton>
        </div>
      </form>
    </UiModal>
  </div>
</template>
