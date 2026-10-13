<script setup lang="ts">
import type { PagedResult, ProviderSummary } from '#shared/types/marketplace'

const props = defineProps<{
  heading: string
  result: PagedResult<ProviderSummary> | null | undefined
  pending: boolean
  currentPage: number
  emptyTitle: string
  emptyHint: string
  /** Shown above the list, e.g. "these providers serve the whole city". */
  note?: string
}>()

const emit = defineEmits<{ page: [number] }>()
const { t } = useI18n()

const pages = computed(() => pageNumbers(props.result?.page ?? 1, props.result?.totalPages ?? 1))
</script>

<template>
  <div class="mb-12">
    <div class="mb-4 flex items-center justify-between">
      <h2 class="text-lg font-bold">
        {{ heading }}
        <span
          v-if="result"
          class="ml-1 text-sm font-normal text-black/50 dark:text-white/50"
        >
          {{ t('seo.list.results', { count: result.total }) }}
        </span>
      </h2>
    </div>

    <p
      v-if="note && result && result.total > 0"
      class="mb-4 rounded-xl bg-brand-50 px-4 py-3 text-xs text-brand-800 dark:bg-brand-900/20 dark:text-brand-100"
    >
      {{ note }}
    </p>

    <div
      v-if="pending"
      class="flex justify-center py-16"
    >
      <div class="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
    </div>

    <template v-else-if="result && result.items.length > 0">
      <div class="flex flex-col gap-4">
        <MarketplaceProviderCard
          v-for="provider in result.items"
          :key="provider.id"
          :provider="provider"
          variant="row"
        />
      </div>

      <nav
        v-if="result.totalPages > 1"
        class="mt-8 flex items-center justify-center gap-1.5"
        :aria-label="t('seo.list.pagination')"
      >
        <button
          type="button"
          class="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 disabled:opacity-40 dark:border-white/10"
          :disabled="currentPage <= 1"
          :aria-label="t('seo.list.previous')"
          @click="emit('page', currentPage - 1)"
        >
          <UiIcon
            name="arrow-right"
            class="rotate-180"
            :size="15"
          />
        </button>
        <template
          v-for="(entry, index) in pages"
          :key="entry ?? `gap-${index}`"
        >
          <span
            v-if="entry === null"
            class="px-1 text-black/40 dark:text-white/40"
            aria-hidden="true"
          >…</span>
          <button
            v-else
            type="button"
            class="h-10 min-w-10 rounded-full px-3 text-sm font-bold transition-colors"
            :class="entry === currentPage ? 'bg-brand-600 text-white' : 'border border-black/10 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10'"
            :aria-current="entry === currentPage ? 'page' : undefined"
            @click="emit('page', entry)"
          >
            {{ entry }}
          </button>
        </template>
        <button
          type="button"
          class="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 disabled:opacity-40 dark:border-white/10"
          :disabled="currentPage >= result.totalPages"
          :aria-label="t('seo.list.next')"
          @click="emit('page', currentPage + 1)"
        >
          <UiIcon
            name="arrow-right"
            :size="15"
          />
        </button>
      </nav>
    </template>

    <div
      v-else
      class="rounded-3xl border border-black/10 bg-white/70 p-12 text-center text-black/60 dark:border-white/10 dark:bg-black/30 dark:text-white/60"
    >
      <p class="text-base font-semibold">
        {{ emptyTitle }}
      </p>
      <p class="mt-1 text-sm">
        {{ emptyHint }}
      </p>
      <NuxtLinkLocale
        to="/browse"
        class="mt-4 inline-block rounded-full bg-brand-600 px-6 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-brand-700"
      >
        {{ t('seo.list.browseAll') }}
      </NuxtLinkLocale>
    </div>
  </div>
</template>
