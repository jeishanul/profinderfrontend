<script setup lang="ts">
import type { JobPostBase } from '#shared/types/jobPosts'
import type { HomeSection } from '#shared/types/cms'

const props = defineProps<{
  section?: HomeSection
  jobs?: JobPostBase[]
}>()

const { t } = useI18n()

// If jobs are provided via prop (the home page loads them with its other lists), use them;
// otherwise fetch dynamically from /jobs/latest.
const { data: response, status } = props.jobs
  ? { data: ref({ items: props.jobs, total: props.jobs.length }), status: ref('success') }
  : useApi<{ items: JobPostBase[], total: number }>('/jobs/latest', {
      query: { limit: sectionNumber(props.section?.settings, 'maxItems', 10) },
      key: 'home-latest-jobs',
      default: () => ({ items: [], total: 0 }),
    })

const items = computed(() => props.jobs ?? response.value?.items ?? [])
const hasJobs = computed(() => items.value.length > 0)

const heading = computed(() => props.section?.heading ? cmsText(props.section.heading, t('marketplace.latestJobs.heading')) : t('marketplace.latestJobs.heading'))
const subheading = computed(() => props.section?.subheading ? cmsText(props.section.subheading, t('marketplace.latestJobs.subheading')) : t('marketplace.latestJobs.subheading'))

const linkButtonClass = 'inline-flex items-center justify-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700 active:scale-[0.97]'
</script>

<template>
  <section
    v-if="hasJobs || status === 'pending'"
    :id="section ? sectionAnchor(section) : undefined"
    class="mx-auto max-w-6xl scroll-mt-24 px-4 py-16 sm:px-6 lg:px-10"
  >
    <div class="mb-9 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <h2 class="font-display text-3xl font-bold sm:text-4xl">
          {{ heading }}
        </h2>
        <p class="mt-2.5 text-black/60 dark:text-white/60">
          {{ subheading }}
        </p>
      </div>

      <NuxtLinkLocale
        to="/jobs"
        class="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 transition hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
      >
        <span>{{ t('marketplace.latestJobs.viewAll') }}</span>
        <UiIcon
          name="arrow-right"
          :size="15"
        />
      </NuxtLinkLocale>
    </div>

    <div
      v-if="items.length > 0"
      class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      <MarketplaceJobCard
        v-for="job in items"
        :key="job.id"
        :post="job"
      />
    </div>

    <div
      v-else-if="status === 'pending'"
      class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      <div
        v-for="n in 4"
        :key="n"
        class="h-48 animate-pulse rounded-2xl bg-black/5 dark:bg-white/5"
      />
    </div>

    <div class="mt-9 flex items-center justify-center">
      <NuxtLinkLocale
        to="/jobs"
        :class="linkButtonClass"
      >
        {{ t('marketplace.latestJobs.viewAll') }}
      </NuxtLinkLocale>
    </div>
  </section>
</template>
