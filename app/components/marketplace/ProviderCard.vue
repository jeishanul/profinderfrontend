<script setup lang="ts">
import type { ProviderProfile } from '#shared/types/marketplace'

// Auto-imported as <MarketplaceProviderCard />. `variant="card"` is the
// vertical tile used in grids (featured providers); `variant="row"` is the
// horizontal list row used on the browse results page. Only the "view
// profile" control navigates — the card itself is a plain container so no
// interactive element ends up nested inside another (an `<a>` wrapping a
// `<button>` is invalid and inaccessible).
const props = withDefaults(
  defineProps<{
    provider: ProviderProfile
    categoryIcon: IconName
    variant?: 'card' | 'row'
  }>(),
  { variant: 'card' },
)

const { t } = useI18n()
const authModal = useAuthModal()
const session = useSession()
const localePath = useLocalePath()
// The parent page (not this component — it's rendered many times in a list
// and isn't a Suspense/page boundary, so a top-level `await` here would
// break Nuxt's composable context) calls `ensureLoaded()` once.
const savedProviders = useSavedProviders()

const isSaving = ref(false)
async function handleToggleSave() {
  if (!session.isAuthenticated.value) {
    authModal.open('login')
    return
  }
  isSaving.value = true
  try {
    await savedProviders.toggle(props.provider.id)
  }
  finally {
    isSaving.value = false
  }
}

const isMessaging = ref(false)
async function handleMessage() {
  if (!session.isAuthenticated.value) {
    authModal.open('login')
    return
  }
  isMessaging.value = true
  try {
    const conversation = await useApiFetch<{ id: string }>('/api/dashboard/conversations', {
      method: 'POST',
      body: { providerId: Number(props.provider.id) },
    })
    await navigateTo(localePath({ path: '/messages', query: { conversation: conversation.id } }))
  }
  finally {
    isMessaging.value = false
  }
}

const linkButtonClass = 'inline-flex items-center justify-center gap-2 rounded-full bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700 active:scale-[0.97]'
</script>

<template>
  <article
    v-if="variant === 'row'"
    class="relative flex flex-col gap-4 rounded-2xl border border-black/10 bg-white/70 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-black/30 sm:flex-row sm:items-center sm:gap-6"
  >
    <button
      type="button"
      class="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 transition-colors hover:text-red-600 disabled:opacity-50 dark:bg-black/40 dark:hover:text-red-400"
      :class="savedProviders.isSaved(provider.id) ? 'text-red-600 dark:text-red-400' : 'text-black/40 dark:text-white/40'"
      :aria-label="savedProviders.isSaved(provider.id) ? t('marketplace.provider.unsave') : t('marketplace.provider.save')"
      :disabled="isSaving"
      @click="handleToggleSave"
    >
      <UiIcon
        name="heart"
        :filled="savedProviders.isSaved(provider.id)"
        :size="16"
      />
    </button>
    <div class="flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-700/20 dark:text-brand-100">
      <UiIcon
        :name="categoryIcon"
        :size="32"
      />
    </div>
    <div class="min-w-0 flex-1">
      <div class="flex items-center gap-2">
        <span class="text-lg font-bold">{{ provider.name }}</span>
        <UiIcon
          v-if="provider.verified"
          name="shield-check"
          filled
          :size="15"
          class="text-brand-600"
        />
      </div>
      <div class="mt-1.5 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-sm text-black/50 dark:text-white/50">
        <UiRating
          :rating="provider.rating"
          :review-count="provider.reviewCount"
        />
        <span>&middot;</span>
        <span>{{ t('marketplace.provider.yearsExperience', { years: provider.yearsExperience }) }}</span>
        <span>&middot;</span>
        <span class="inline-flex items-center gap-1">
          <UiIcon
            name="map-pin"
            :size="13"
          />{{ provider.cityName }}
        </span>
      </div>
      <div class="mt-3 flex flex-wrap gap-2">
        <UiTag
          v-for="skillId in provider.skillIds.slice(0, 3)"
          :key="skillId"
        >
          {{ t(`marketplace.skills.${skillId}`) }}
        </UiTag>
      </div>
    </div>
    <div class="flex shrink-0 flex-col items-start gap-3 sm:items-end">
      <p class="font-display text-xl font-bold">
        {{ t('marketplace.provider.estimate', { rate: provider.ratePerHour }) }}
      </p>
      <div class="flex gap-2">
        <UiButton
          variant="ghost"
          :disabled="isMessaging"
          @click="handleMessage"
        >
          {{ t('marketplace.provider.message') }}
        </UiButton>
        <NuxtLinkLocale
          :to="`/providers/${provider.id}`"
          :class="linkButtonClass"
        >
          {{ t('marketplace.provider.viewProfile') }}
        </NuxtLinkLocale>
      </div>
    </div>
  </article>

  <article
    v-else
    class="relative flex flex-col gap-3.5 rounded-2xl border border-black/10 bg-white/70 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-black/30"
  >
    <button
      type="button"
      class="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 transition-colors hover:text-red-600 disabled:opacity-50 dark:bg-black/40 dark:hover:text-red-400"
      :class="savedProviders.isSaved(provider.id) ? 'text-red-600 dark:text-red-400' : 'text-black/40 dark:text-white/40'"
      :aria-label="savedProviders.isSaved(provider.id) ? t('marketplace.provider.unsave') : t('marketplace.provider.save')"
      :disabled="isSaving"
      @click="handleToggleSave"
    >
      <UiIcon
        name="heart"
        :filled="savedProviders.isSaved(provider.id)"
        :size="16"
      />
    </button>

    <div class="flex items-center gap-3">
      <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700 dark:bg-brand-700/20 dark:text-brand-100">
        <UiIcon
          :name="categoryIcon"
          :size="26"
        />
      </div>
      <div class="min-w-0">
        <div class="flex items-center gap-1.5">
          <span class="truncate font-bold">{{ provider.name }}</span>
          <UiIcon
            v-if="provider.verified"
            name="shield-check"
            filled
            :size="14"
            class="shrink-0 text-brand-600"
          />
        </div>
        <p class="text-xs text-black/50 dark:text-white/50">
          {{ t(`marketplace.categories.${provider.categoryId}.label`) }}
        </p>
      </div>
    </div>

    <UiRating
      :rating="provider.rating"
      :review-count="provider.reviewCount"
    />

    <div class="flex flex-wrap gap-2">
      <UiTag
        v-for="skillId in provider.skillIds.slice(0, 2)"
        :key="skillId"
      >
        {{ t(`marketplace.skills.${skillId}`) }}
      </UiTag>
    </div>

    <div class="flex items-center justify-between border-t border-black/10 pt-3.5 text-sm text-black/50 dark:border-white/10 dark:text-white/50">
      <span>{{ t('marketplace.provider.fromEstimate', { rate: provider.ratePerHour }) }}</span>
      <span class="inline-flex items-center gap-1">
        <UiIcon
          name="map-pin"
          :size="13"
        />{{ provider.cityName }}
      </span>
    </div>

    <NuxtLinkLocale
      :to="`/providers/${provider.id}`"
      :class="linkButtonClass"
      class="w-full"
    >
      {{ t('marketplace.provider.viewProfile') }}
    </NuxtLinkLocale>
  </article>
</template>
