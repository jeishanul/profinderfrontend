<script setup lang="ts">
import type { SavedProvider } from '#shared/types/dashboard'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
})

const { t } = useI18n()

const toast = useToast()
const saved = useSavedProviders()

const list = await usePagedList<SavedProvider>('/dashboard/saved-providers', {
  key: 'dashboard-saved-providers',
  perPage: 12,
})
const visibleProviders = list.items
await saved.ensureLoaded()

const TONES = ['primary', 'accent', 'neutral'] as const
function toneFor(index: number) {
  return TONES[index % TONES.length] ?? 'primary'
}

// Un-saving goes through the shared state, so hearts elsewhere agree, and is undoable.
async function remove(id: string) {
  const provider = visibleProviders.value.find(item => item.id === id)
  try {
    await saved.unsave(id)
    await list.refresh()
  }
  catch (error) {
    toast.error(apiErrorMessage(error, t('dashboard.savedProviders.errors.remove')))
    return
  }
  toast.success(t('dashboard.savedProviders.removed', { name: provider?.name ?? '' }), {
    label: t('dashboard.savedProviders.undo'),
    run: async () => {
      try {
        await saved.save(id)
        await list.refresh()
      }
      catch (error) {
        toast.error(apiErrorMessage(error, t('dashboard.savedProviders.errors.restore')))
      }
    },
  })
}

useSeoMeta({
  title: t('dashboard.savedProviders.title'),
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="font-display text-2xl font-bold">
          {{ t('dashboard.savedProviders.title') }}
        </h1>
        <p class="mt-0.5 text-sm text-black/60 dark:text-white/60">
          {{ t('dashboard.savedProviders.subtitle') }}
        </p>
      </div>
    </div>

    <p class="text-sm font-semibold text-black/60 dark:text-white/60">
      {{ t('dashboard.savedProviders.count', { count: list.meta.value?.total ?? 0 }) }}
    </p>

    <div
      v-if="visibleProviders.length > 0"
      class="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3"
    >
      <DashboardSavedProviderCard
        v-for="(provider, index) in visibleProviders"
        :key="provider.id"
        :provider="provider"
        :tone="toneFor(index)"
        @remove="remove"
      />
    </div>

    <div
      v-else
      class="rounded-2xl border border-black/10 p-8 text-center sm:p-12 dark:border-white/10"
    >
      <p class="text-sm font-semibold text-black/60 dark:text-white/60">
        {{ t('dashboard.savedProviders.empty') }}
      </p>
      <NuxtLinkLocale
        to="/browse"
        :class="[linkButtonClass('primary'), 'mt-4 inline-flex']"
      >
        {{ t('dashboard.savedProviders.browse') }}
      </NuxtLinkLocale>
    </div>

    <DashboardLoadMore
      :shown="visibleProviders.length"
      :total="list.meta.value?.total ?? 0"
      :has-more="list.hasMore.value"
      :loading="list.loadingMore.value"
      :failed="list.loadMoreFailed.value"
      @more="list.loadMore()"
    />
  </div>
</template>
