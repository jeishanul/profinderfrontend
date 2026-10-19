<script setup lang="ts">
import type { JobPostBase } from '#shared/types/jobPosts'

const { t } = useI18n()
const { data: categories } = await useCategories()

const route = useRoute()

const category = ref<string | null>((route.query.category as string) || null)
const province = ref<string | null>((route.query.province as string) || null)
const city = ref<string | null>((route.query.city as string) || null)
const budgetMin = ref<string>((route.query.budgetMin as string) || '')
const search = ref<string>((route.query.q as string) || '')
const sort = ref<'newest' | 'soonest' | 'budget'>((route.query.sort as 'newest' | 'soonest' | 'budget') || 'newest')

const debouncedSearch = refDebounced(search, 300)
const debouncedBudget = refDebounced(budgetMin, 400)

const list = await usePagedList<JobPostBase>('/jobs', {
  key: 'public-jobs-feed',
  query: computed(() => ({
    category: category.value ?? undefined,
    province: province.value ?? undefined,
    city: city.value ?? undefined,
    budgetMin: Number(debouncedBudget.value) > 0 ? debouncedBudget.value : undefined,
    q: debouncedSearch.value.trim() || undefined,
    sort: sort.value,
  })),
})

const categoryOptions = computed(() => (categories.value ?? []).map(c => ({ value: c.id, label: c.name })))

const hasFilters = computed(() => !!(category.value || province.value || city.value || budgetMin.value || search.value.trim()))
function clearFilters() {
  category.value = null
  province.value = null
  city.value = null
  budgetMin.value = ''
  search.value = ''
}

const { settings } = useSiteSettings()
useSeoMeta({
  title: () => `${t('publicJobs.seoTitle')} | ${settings.value.siteName ?? t('brand.name')}`,
  description: () => t('publicJobs.seoDescription'),
})
useSchemaOrg([defineWebPage()])
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
    <div class="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h1 class="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          {{ t('publicJobs.title') }}
        </h1>
        <p class="mt-2 text-sm text-black/60 dark:text-white/60">
          {{ t('publicJobs.subtitle') }}
        </p>
      </div>

      <NuxtLinkLocale
        to="/seek-job/new"
        class="inline-flex items-center justify-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 active:scale-[0.98]"
      >
        <UiIcon
          name="plus"
          :size="16"
        />
        <span>{{ t('publicJobs.postJob') }}</span>
      </NuxtLinkLocale>
    </div>

    <!-- Filter Bar -->
    <div class="mb-8 rounded-2xl border border-black/10 bg-white/70 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-black/30">
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <UiInput
          v-model="search"
          icon="search"
          :aria-label="t('publicJobs.searchPlaceholder')"
          :placeholder="t('publicJobs.searchPlaceholder')"
          class="sm:col-span-2"
        />
        <UiSelectSearch
          v-model="category"
          :options="categoryOptions"
          :placeholder="t('publicJobs.filterCategory')"
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
          class="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm text-black outline-none transition focus:border-brand-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
        >
        <select
          v-model="sort"
          :aria-label="t('publicJobs.sortBy')"
          class="rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm text-black outline-none transition focus:border-brand-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
        >
          <option value="newest">
            {{ t('publicJobs.sortNewest') }}
          </option>
          <option value="soonest">
            {{ t('publicJobs.sortSoonest') }}
          </option>
          <option value="budget">
            {{ t('publicJobs.sortBudget') }}
          </option>
        </select>
        <div
          v-if="hasFilters"
          class="flex items-center sm:col-span-2"
        >
          <UiButton
            variant="ghost"
            size="sm"
            @click="clearFilters"
          >
            {{ t('findJobs.filters.clear') }}
          </UiButton>
        </div>
      </div>
    </div>

    <!-- Jobs Grid -->
    <div
      v-if="list.items.value.length > 0"
      class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
    >
      <MarketplaceJobCard
        v-for="job in list.items.value"
        :key="job.id"
        :post="job"
      />
    </div>

    <!-- Empty State -->
    <div
      v-else
      class="rounded-2xl border border-dashed border-black/15 py-16 px-6 text-center dark:border-white/15"
    >
      <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-950/50 dark:text-brand-300">
        <UiIcon
          name="search"
          :size="26"
        />
      </div>
      <h3 class="mt-4 font-display text-lg font-bold">
        {{ t('publicJobs.noJobsFound') }}
      </h3>
      <p class="mx-auto mt-1 max-w-md text-sm text-black/60 dark:text-white/60">
        {{ t('publicJobs.noJobsFoundSub') }}
      </p>
      <div class="mt-6 flex justify-center gap-3">
        <UiButton
          v-if="hasFilters"
          variant="secondary"
          @click="clearFilters"
        >
          {{ t('findJobs.filters.clear') }}
        </UiButton>
        <NuxtLinkLocale
          to="/seek-job/new"
          class="inline-flex items-center justify-center gap-2 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
        >
          {{ t('publicJobs.postJob') }}
        </NuxtLinkLocale>
      </div>
    </div>

    <!-- Load More -->
    <div class="mt-10">
      <DashboardLoadMore
        :shown="list.items.value.length"
        :total="list.meta.value?.total ?? 0"
        :has-more="list.hasMore.value"
        :loading="list.loadingMore.value"
        :failed="list.loadMoreFailed.value"
        @more="list.loadMore()"
      />
    </div>
  </div>
</template>
