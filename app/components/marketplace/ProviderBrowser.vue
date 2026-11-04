<script setup lang="ts">
import type { PagedResult, ProviderSummary, ServiceCategory } from '#shared/types/marketplace'

// Auto-imported as <MarketplaceProviderBrowser/>. The filter sidebar (a bottom sheet on phones) next to the searchable,
// sortable, paged provider list. Shared by `/browse` and the category and sub-category landing pages; the state comes
// from `useBrowseFilters()` in the page, and the sidebar runs in link mode, so picking a category opens its page.
const props = withDefaults(defineProps<{
  categories: ServiceCategory[]
  result: PagedResult<ProviderSummary> | null | undefined
  activeCategory?: string | null
  activeSkill?: string | null
  carriedQuery?: Record<string, string>
  searchPlaceholder?: string
}>(), { activeCategory: null, activeSkill: null, carriedQuery: () => ({}), searchPlaceholder: '' })

const emit = defineEmits<{
  apply: []
  reset: []
  page: [number]
}>()

const filters = defineModel<BrowseFilters>('filters', { required: true })
const draft = defineModel<BrowseFilters>('draft', { required: true })
const search = defineModel<string>('search', { required: true })
const sheetOpen = defineModel<boolean>('sheetOpen', { required: true })

const { t } = useI18n()

const pages = computed(() => pageNumbers(props.result?.page ?? 1, props.result?.totalPages ?? 1))
</script>

<template>
  <div>
    <div class="flex items-center justify-between gap-3">
      <slot name="heading" />
      <button
        type="button"
        class="flex shrink-0 items-center gap-2 rounded-full border border-black/10 px-4 py-2.5 text-sm font-bold md:hidden dark:border-white/10"
        @click="sheetOpen = true"
      >
        <UiIcon
          name="sliders"
          :size="15"
        />
        {{ t('marketplace.filters.heading') }}
      </button>
    </div>

    <div class="mt-8 grid gap-7 md:grid-cols-[260px_minmax(0,1fr)] lg:grid-cols-[300px_minmax(0,1fr)]">
      <!-- This wrapper is the grid cell and stretches to the row's full
           height (matching the results column); the sidebar itself is the
           `sticky` element inside it, so it has room to travel and pin all
           the way down a tall results list instead of stopping early.
           Hidden below `md` (phones only) — tablet has the width for the
           real sidebar (narrower than desktop's, widening again at `lg`),
           so only phones fall back to the bottom sheet (`UiBottomSheet`
           below); tablet never sees a full-width inline sidebar-less list. -->
      <div class="hidden md:block">
        <MarketplaceProviderFilterSidebar
          v-model:category-ids="filters.categories"
          v-model:province="filters.province"
          v-model:city="filters.city"
          v-model:barangay="filters.barangay"
          v-model:min-rating="filters.minRating"
          v-model:verified-only="filters.verifiedOnly"
          v-model:min-price="filters.minPrice"
          v-model:max-price="filters.maxPrice"
          v-model:skill-ids="filters.skills"
          v-model:available-day="filters.availableDay"
          :categories="categories"
          :show-apply="false"
          link-mode
          :active-category="activeCategory"
          :active-skill="activeSkill"
          :carried-query="carriedQuery"
          class="sticky top-28"
        />
      </div>

      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-3 sm:flex-row">
          <UiInput
            v-model="search"
            icon="search"
            class="flex-1"
            :placeholder="searchPlaceholder || t('marketplace.browse.searchPlaceholder')"
            :aria-label="searchPlaceholder || t('marketplace.browse.searchPlaceholder')"
          />
          <select
            v-model="filters.sort"
            :aria-label="t('marketplace.browse.sortLabel')"
            class="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
          >
            <option
              v-for="option in BROWSE_SORTS"
              :key="option"
              :value="option"
            >
              {{ t(`marketplace.browse.sort.${option}`) }}
            </option>
          </select>
        </div>

        <template v-if="result && result.items.length">
          <MarketplaceProviderCard
            v-for="provider in result.items"
            :key="provider.id"
            :provider="provider"
            variant="row"
          />
        </template>
        <p
          v-else
          class="rounded-2xl border border-black/10 bg-white/70 p-8 text-center text-black/60 dark:border-white/10 dark:bg-black/30 dark:text-white/60"
        >
          {{ t('marketplace.browse.noResults') }}
        </p>

        <nav
          v-if="result && result.totalPages > 1"
          class="mt-2 flex items-center justify-center gap-1.5"
          :aria-label="t('marketplace.browse.pagination')"
        >
          <button
            type="button"
            class="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 disabled:opacity-40 dark:border-white/10"
            :disabled="filters.page <= 1"
            :aria-label="t('marketplace.browse.previousPage')"
            @click="emit('page', filters.page - 1)"
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
              :class="entry === result.page ? 'bg-brand-600 text-white' : 'border border-black/10 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10'"
              :aria-current="entry === result.page ? 'page' : undefined"
              @click="emit('page', entry)"
            >
              {{ entry }}
            </button>
          </template>
          <button
            type="button"
            class="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 disabled:opacity-40 dark:border-white/10"
            :disabled="filters.page >= result.totalPages"
            :aria-label="t('marketplace.browse.nextPage')"
            @click="emit('page', filters.page + 1)"
          >
            <UiIcon
              name="arrow-right"
              :size="15"
            />
          </button>
        </nav>
      </div>
    </div>

    <UiBottomSheet
      :open="sheetOpen"
      labelledby="browse-filter-sheet-heading"
      @close="sheetOpen = false"
    >
      <div class="px-5 pb-6">
        <h2
          id="browse-filter-sheet-heading"
          class="sr-only"
        >
          {{ t('marketplace.filters.heading') }}
        </h2>
        <MarketplaceProviderFilterSidebar
          v-model:category-ids="draft.categories"
          v-model:province="draft.province"
          v-model:city="draft.city"
          v-model:barangay="draft.barangay"
          v-model:min-rating="draft.minRating"
          v-model:verified-only="draft.verifiedOnly"
          v-model:min-price="draft.minPrice"
          v-model:max-price="draft.maxPrice"
          v-model:skill-ids="draft.skills"
          v-model:available-day="draft.availableDay"
          :categories="categories"
          id-prefix="browse-filter-sheet"
          link-mode
          :active-category="activeCategory"
          :active-skill="activeSkill"
          :carried-query="carriedQuery"
          bare
          @apply="emit('apply')"
          @reset="emit('reset')"
        />
      </div>
    </UiBottomSheet>
  </div>
</template>
