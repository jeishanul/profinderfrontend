<script setup lang="ts">
import type { SavedProvider } from '#shared/types/dashboard'

// Auto-imported as <DashboardSavedProviderCard/>. One card on the saved
// providers page, with a working "unsave" (heart) action and a "Message"
// action that opens/creates a real conversation with this provider.
const props = defineProps<{
  provider: SavedProvider
  tone: 'primary' | 'accent' | 'neutral'
}>()

defineEmits<{
  remove: [id: string]
}>()

const { t, locale } = useI18n()
const { money } = useSiteSettings()
const categoryLabel = useCategoryLabel()
const localePath = useLocalePath()
const bookAgain = useBookAgain()

const TONE_CLASS: Record<'primary' | 'accent' | 'neutral', string> = {
  primary: 'bg-brand-50 text-brand-700 dark:bg-brand-700/20 dark:text-brand-100',
  accent: 'bg-accent-50 text-accent-700 dark:bg-accent-700/20 dark:text-accent-100',
  neutral: 'bg-black/5 text-black/60 dark:bg-white/10 dark:text-white/60',
}

const toast = useToast()

async function messageProvider() {
  try {
    const conversation = await useApiFetch<{ id: string }>('/api/dashboard/conversations', {
      method: 'POST',
      body: { providerId: Number(props.provider.id) },
    })
    await navigateTo(localePath({ path: '/messages', query: { conversation: conversation.id } }))
  }
  catch (error) {
    toast.error(apiErrorMessage(error, t('dashboard.savedProviders.errors.message')))
  }
}
</script>

<template>
  <div class="flex flex-col gap-3 rounded-2xl border border-black/10 p-5 dark:border-white/10">
    <div class="flex items-start justify-between gap-2.5">
      <NuxtLinkLocale
        :to="`/providers/${provider.id}`"
        class="flex items-center gap-3 rounded-lg hover:opacity-80"
        :aria-label="t('dashboard.savedProviders.viewProfile', { name: provider.name })"
      >
        <img
          v-if="provider.avatarUrl"
          :src="provider.avatarUrl"
          :alt="provider.name"
          class="h-13 w-13 shrink-0 rounded-full object-cover"
        >
        <span
          v-else
          class="flex h-13 w-13 shrink-0 items-center justify-center rounded-full font-display text-[17px] font-bold"
          :class="TONE_CLASS[tone]"
        >
          {{ initialsFor(provider.name) }}
        </span>
        <div>
          <div class="flex items-center gap-1.5">
            <span class="text-[15px] font-bold">{{ provider.name }}</span>
            <UiIcon
              v-if="provider.verified"
              name="shield-check"
              :size="14"
              class="shrink-0 text-brand-600"
            />
          </div>
          <div class="text-xs text-black/60 dark:text-white/60">
            {{ categoryLabel(provider.categoryId, provider.categoryName) }}
          </div>
        </div>
      </NuxtLinkLocale>
      <button
        type="button"
        class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-700 transition-colors hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50"
        :aria-label="t('dashboard.savedProviders.remove')"
        @click="$emit('remove', provider.id)"
      >
        <UiIcon
          name="heart"
          filled
          :size="15"
        />
      </button>
    </div>

    <div class="flex items-center gap-3.5 text-xs text-black/60 dark:text-white/60">
      <span class="flex items-center gap-1">
        <UiIcon
          name="star"
          filled
          :size="13"
          class="text-accent-600"
        />
        <span class="font-bold text-black dark:text-white">{{ provider.rating.toFixed(1) }}</span> ({{ provider.reviewCount }})
      </span>
      <span>{{ provider.lastBookedAt
        ? t('dashboard.savedProviders.bookedOn', { date: formatDate(provider.lastBookedAt, locale) })
        : t('dashboard.savedProviders.neverBooked') }}</span>
    </div>

    <div class="flex items-center justify-between border-t border-black/10 pt-3 dark:border-white/10">
      <div class="text-[15px] font-bold">
        {{ t('marketplace.provider.estimate', { rate: money(provider.hourlyRateUsd) }) }}
      </div>
      <div class="flex gap-2">
        <UiButton
          variant="ghost"
          size="sm"
          @click="messageProvider"
        >
          {{ t('dashboard.savedProviders.message') }}
        </UiButton>
        <UiButton
          size="sm"
          :disabled="!provider.verified"
          :title="provider.verified ? undefined : t('marketplace.provider.pendingVerification')"
          @click="bookAgain.requestFrom(provider.id, provider.name)"
        >
          {{ t('dashboard.savedProviders.bookNow') }}
        </UiButton>
      </div>
    </div>
  </div>
</template>
