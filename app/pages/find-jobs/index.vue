<script setup lang="ts">
import type { JobPostForProvider } from '#shared/types/jobPosts'

// Open jobs from clients, for a provider to apply to. By default only the ones in the provider's own category and
// province ("Matching"); the filters widen that to anything.
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'provider'],
  hideBottomNav: true,
})

const { t } = useI18n()
const jobError = useJobErrors()
const { data: categories } = await useCategories()

const scope = ref<'matching' | 'all'>('matching')
const category = ref<string | null>(null)
const province = ref<string | null>(null)
const city = ref<string | null>(null)
const budgetMin = ref('')
const sort = ref<'newest' | 'soonest' | 'budget'>('newest')
const search = ref('')
const debouncedSearch = refDebounced(search, 300)
const debouncedBudget = refDebounced(budgetMin, 400)

const list = await usePagedList<JobPostForProvider>('/dashboard/seek-jobs', {
  key: 'find-jobs-feed',
  query: computed(() => ({
    scope: scope.value,
    category: category.value ?? undefined,
    province: province.value ?? undefined,
    city: city.value ?? undefined,
    budgetMin: Number(debouncedBudget.value) > 0 ? debouncedBudget.value : undefined,
    q: debouncedSearch.value.trim() || undefined,
    sort: sort.value,
  })),
})

const categoryOptions = computed(() => (categories.value ?? []).map(c => ({ value: c.id, label: c.name })))

// A profile that isn't complete yet can't browse: say what to do instead of showing an empty list.
const blockedMessage = computed(() => {
  const code = apiErrorCode(list.error.value)
  return code === 'provider_profile_incomplete' || code === 'provider_required' ? jobError(list.error.value) : ''
})

const hasFilters = computed(() => !!(category.value || province.value || city.value || budgetMin.value || search.value.trim()))
function clearFilters() {
  category.value = null
  province.value = null
  city.value = null
  budgetMin.value = ''
  search.value = ''
}

useSeoMeta({ title: t('findJobs.title') })
</script>

<template>
  <div class="flex flex-col gap-6">
    <UiBackButton fallback="/" />

    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="font-display text-2xl font-bold">
          {{ t('findJobs.title') }}
        </h1>
        <p class="mt-0.5 text-sm text-black/60 dark:text-white/60">
          {{ t('findJobs.subtitle') }}
        </p>
      </div>
      <NuxtLinkLocale
        to="/find-jobs/applications"
        :class="linkButtonClass('secondary')"
      >
        {{ t('dashboard.sidebar.myApplications') }}
      </NuxtLinkLocale>
    </div>

    <p
      v-if="blockedMessage"
      role="alert"
      class="rounded-xl bg-accent-50 px-4 py-3 text-sm font-semibold text-accent-700 dark:bg-accent-700/20 dark:text-accent-100"
    >
      {{ blockedMessage }}
      <NuxtLinkLocale
        to="/profile"
        class="underline"
      >
        {{ t('dashboard.sidebar.myProfile') }}
      </NuxtLinkLocale>
    </p>

    <template v-else>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="option in (['matching', 'all'] as const)"
          :key="option"
          type="button"
          class="rounded-full border px-4 py-2 text-xs font-bold transition-colors"
          :class="scope === option
            ? 'border-brand-600 bg-brand-600 text-white'
            : 'border-black/10 bg-white text-black/60 hover:text-black dark:border-white/10 dark:bg-white/5 dark:text-white/60 dark:hover:text-white'"
          :aria-pressed="scope === option"
          @click="scope = option"
        >
          {{ t(`findJobs.scopes.${option}`) }}
        </button>
      </div>

      <div class="grid gap-3 rounded-2xl border border-black/10 p-4 sm:grid-cols-2 lg:grid-cols-4 dark:border-white/10">
        <UiInput
          v-model="search"
          icon="search"
          :aria-label="t('findJobs.filters.search')"
          :placeholder="t('findJobs.filters.search')"
          class="sm:col-span-2"
        />
        <UiSelectSearch
          v-model="category"
          :options="categoryOptions"
          :placeholder="t('findJobs.filters.allCategories')"
          :search-placeholder="t('seekJob.form.fields.category.search')"
        />
        <UiLocationPicker
          v-model:province="province"
          v-model:city="city"
          :placeholder="t('findJobs.filters.location')"
        />
        <input
          v-model="budgetMin"
          type="number"
          min="1"
          inputmode="numeric"
          :aria-label="t('findJobs.filters.budgetMin')"
          :placeholder="t('findJobs.filters.budgetMin')"
          class="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
        >
        <select
          v-model="sort"
          :aria-label="t('findJobs.filters.sort')"
          class="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
        >
          <option
            v-for="option in (['newest', 'soonest', 'budget'] as const)"
            :key="option"
            :value="option"
          >
            {{ t(`findJobs.sort.${option}`) }}
          </option>
        </select>
        <UiButton
          v-if="hasFilters"
          variant="ghost"
          size="sm"
          class="justify-self-start"
          @click="clearFilters"
        >
          {{ t('findJobs.filters.clear') }}
        </UiButton>
      </div>

      <div
        v-if="list.items.value.length > 0"
        class="grid gap-4 lg:grid-cols-2"
      >
        <DashboardJobFeedCard
          v-for="post in list.items.value"
          :key="post.id"
          :post="post"
        />
      </div>

      <div
        v-else
        class="rounded-2xl border border-dashed border-black/15 p-10 text-center dark:border-white/15"
      >
        <p class="font-display text-lg font-bold">
          {{ t('findJobs.empty.title') }}
        </p>
        <p class="mx-auto mt-1 max-w-md text-sm text-black/60 dark:text-white/60">
          {{ scope === 'matching' && !hasFilters ? t('findJobs.empty.matchingHint') : t('findJobs.empty.allHint') }}
        </p>
      </div>

      <DashboardLoadMore
        :shown="list.items.value.length"
        :total="list.meta.value?.total ?? 0"
        :has-more="list.hasMore.value"
        :loading="list.loadingMore.value"
        :failed="list.loadMoreFailed.value"
        @more="list.loadMore()"
      />
    </template>
  </div>
</template>
