<script setup lang="ts">
// Auto-imported as <DashboardEmailVerifyBanner/>. Shown across the dashboard
// until the account's email is confirmed — sending a booking request and
// becoming a provider need it (browsing and messaging don't).
const { t } = useI18n()
const session = useSession()
const verification = useEmailVerification()
</script>

<template>
  <div
    v-if="session.isAuthenticated.value && session.user.value && !session.user.value.emailVerified"
    class="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent-600/30 bg-accent-50 p-4 dark:bg-accent-700/10"
    role="status"
  >
    <div class="flex items-center gap-3">
      <UiIcon
        name="mail"
        :size="20"
        class="shrink-0 text-accent-700 dark:text-accent-100"
      />
      <div>
        <p class="text-sm font-bold">
          {{ t('dashboard.emailBanner.title') }}
        </p>
        <p class="text-xs text-black/60 dark:text-white/60">
          {{ t('dashboard.emailBanner.body', { email: session.user.value.email }) }}
        </p>
      </div>
    </div>
    <UiButton
      size="sm"
      :disabled="verification.isStarting.value"
      @click="verification.start()"
    >
      {{ t('dashboard.emailBanner.cta') }}
    </UiButton>
  </div>
</template>
