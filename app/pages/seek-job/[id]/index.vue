<script setup lang="ts">
import type { JobApplicant, JobApplicantListMeta, JobPost } from '#shared/types/jobPosts'

// One of the consumer's posts: what it says, where it stands, and the providers who applied, best first. This is
// where they message, decline and hire; closing and reopening live here too.
definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
  hideBottomNav: true,
})

const { t } = useI18n()
const route = useRoute()
const localePath = useLocalePath()
const toast = useToast()
const { confirm, prompt } = useConfirm()
const jobError = useJobErrors()
const { budgetLabel, timeLabel, dateLabel, placeLabel, relativeLabel } = useJobLabels()

const id = String(route.params.id)
const postKey = `seek-job-${id}`

const { data: post, error, refresh: refreshPost } = await useApi<JobPost>(`/dashboard/job-posts/${id}`, { key: postKey })
if (error.value || !post.value) {
  throw createError({ statusCode: apiErrorStatus(error.value) ?? 404, statusMessage: t('errors.notFound'), fatal: true })
}

// --- applicants ----------------------------------------------------------------------------------------------------
const SORTS = ['recommended', 'price', 'newest'] as const
const FILTERS = ['active', 'all', 'pending', 'hired', 'not_selected', 'declined', 'withdrawn'] as const
const sort = ref<(typeof SORTS)[number]>('recommended')
const filter = ref<(typeof FILTERS)[number]>('active')

const applicants = await usePagedList<JobApplicant, JobApplicantListMeta>(`/dashboard/job-posts/${id}/applications`, {
  key: `seek-job-applicants-${id}`,
  query: computed(() => ({ sort: sort.value, status: filter.value })),
})

const counts = computed(() => applicants.meta.value?.counts ?? post.value?.applicationCounts)
const filterOptions = computed(() => FILTERS.map((value) => {
  const c = counts.value
  const count = !c
    ? 0
    : ({ active: c.pending + c.hired, all: c.pending + c.hired + c.notSelected + c.declined + c.withdrawn, pending: c.pending, hired: c.hired, not_selected: c.notSelected, declined: c.declined, withdrawn: c.withdrawn })[value]
  return { value, label: t(`seekJob.detail.applicants.filters.${value}`), count }
}))

// Looking at the list is what clears the "new" dots and the sidebar badge.
onMounted(async () => {
  if ((post.value?.newApplicationsCount ?? 0) === 0) return
  try {
    await useApiFetch(`/api/dashboard/job-posts/${id}/applications/seen`, { method: 'POST' })
    await refreshNuxtData(UNREAD_APPLICANTS_KEY)
  }
  catch {
    // Not being able to mark them seen is harmless; they just stay "new" until next time.
  }
})

async function reload() {
  await Promise.all([refreshPost(), applicants.refresh(), refreshNuxtData('seek-job-posts'), refreshNuxtData(UNREAD_APPLICANTS_KEY)])
}

// --- banner --------------------------------------------------------------------------------------------------------
const hiredName = computed(() => applicants.items.value.find(a => a.status === 'hired')?.provider.name ?? null)

const banner = computed(() => {
  const p = post.value!
  switch (p.status) {
    case 'open': return { tone: 'primary', text: t('seekJob.detail.banner.open', { when: p.expiresAt ? dateLabel(p.expiresAt) : '' }) }
    case 'hired': return { tone: 'accent', text: hiredName.value ? t('seekJob.detail.banner.hired', { name: hiredName.value }) : t('seekJob.detail.banner.hiredNoName') }
    case 'completed': return { tone: 'neutral', text: t('seekJob.detail.banner.completed') }
    case 'removed': return { tone: 'danger', text: t('seekJob.detail.banner.removed') }
    default: return { tone: p.closedReason === 'booking_cancelled' ? 'danger' : 'neutral', text: t(`seekJob.detail.banner.${p.closedReason ?? 'by_consumer'}`) }
  }
})
const BANNER_CLASS: Record<string, string> = {
  primary: 'bg-brand-50 text-brand-700 dark:bg-brand-700/20 dark:text-brand-100',
  accent: 'bg-accent-50 text-accent-700 dark:bg-accent-700/20 dark:text-accent-100',
  danger: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  neutral: 'bg-black/5 text-black/70 dark:bg-white/10 dark:text-white/70',
}

// --- post actions --------------------------------------------------------------------------------------------------
const busy = ref(false)

async function run(action: () => Promise<unknown>, successKey?: string) {
  busy.value = true
  try {
    await action()
    if (successKey) toast.success(t(successKey))
    await reload()
  }
  catch (e) {
    toast.error(jobError(e))
  }
  finally {
    busy.value = false
  }
}

async function closePost() {
  const ok = await confirm({
    title: t('seekJob.detail.close.title'),
    message: t('seekJob.detail.close.message'),
    confirmLabel: t('seekJob.detail.close.confirm'),
    tone: 'danger',
  })
  if (ok) await run(() => useApiFetch(`/api/dashboard/job-posts/${id}/close`, { method: 'POST' }), 'seekJob.detail.close.done')
}

// Reopening needs a new date when the old one has passed (the server refuses otherwise).
const dateHasPassed = computed(() => !!post.value?.preferredDate && new Date(`${post.value.preferredDate}T23:59:59`).getTime() < Date.now())
const reopenDate = ref('')
const isReopenOpen = ref(false)
const tomorrow = toDateTimeLocalValue(new Date(Date.now() + 86_400_000)).slice(0, 10)

async function reopenPost() {
  if (dateHasPassed.value) {
    reopenDate.value = ''
    isReopenOpen.value = true
    return
  }
  const ok = await confirm({
    title: t('seekJob.detail.reopen.title'),
    message: t('seekJob.detail.reopen.message'),
    confirmLabel: t('seekJob.detail.reopen.confirm'),
  })
  if (ok) await run(() => useApiFetch(`/api/dashboard/job-posts/${id}/reopen`, { method: 'POST', body: {} }), 'seekJob.detail.reopen.done')
}

async function reopenWithDate() {
  if (!reopenDate.value) return
  isReopenOpen.value = false
  await run(() => useApiFetch(`/api/dashboard/job-posts/${id}/reopen`, { method: 'POST', body: { preferredDate: reopenDate.value } }), 'seekJob.detail.reopen.done')
}

async function deletePost() {
  const ok = await confirm({
    title: t('seekJob.detail.delete.title'),
    message: t('seekJob.detail.delete.message'),
    confirmLabel: t('seekJob.detail.delete.confirm'),
    tone: 'danger',
  })
  if (!ok) return
  busy.value = true
  try {
    await useApiFetch(`/api/dashboard/job-posts/${id}`, { method: 'DELETE' })
    toast.success(t('seekJob.detail.delete.done'))
    await refreshNuxtData('seek-job-posts')
    await navigateTo(localePath('/seek-job'))
  }
  catch (e) {
    toast.error(jobError(e))
    busy.value = false
  }
}

// --- applicant actions ---------------------------------------------------------------------------------------------
const hiring = ref<JobApplicant | null>(null)
const hireError = ref('')

async function confirmHire() {
  const target = hiring.value
  if (!target) return
  busy.value = true
  hireError.value = ''
  try {
    const result = await useApiFetch<{ bookingId: string }>(`/api/dashboard/job-post-applications/${target.id}/hire`, { method: 'POST', body: { offerUpdatedAt: target.offerUpdatedAt } })
    toast.success(t('seekJob.hire.done', { name: target.provider.name }))
    hiring.value = null
    // The hire has happened; a failed refresh must not read as a failed hire.
    await reload().catch(() => {})
    await navigateTo(localePath({ path: '/purchases', query: { booking: result.bookingId } }))
  }
  catch (e) {
    // Shown in the dialog, next to the button that was just pressed; the list behind it may have changed.
    hireError.value = jobError(e)
    await reload().catch(() => {})
    // Show the refreshed offer (e.g. new price) in the dialog, so confirming again hires on what is on screen.
    hiring.value = applicants.items.value.find(a => a.id === target.id) ?? target
  }
  finally {
    busy.value = false
  }
}

async function decline(applicant: JobApplicant) {
  const reason = await prompt({
    title: t('seekJob.decline.title'),
    message: t('seekJob.decline.message'),
    confirmLabel: t('seekJob.decline.confirm'),
    tone: 'danger',
    input: { label: t('seekJob.decline.reasonLabel'), placeholder: t('seekJob.decline.reasonPlaceholder'), maxLength: 255 },
  })
  if (reason === null) return
  await run(() => useApiFetch(`/api/dashboard/job-post-applications/${applicant.id}/decline`, { method: 'POST', body: reason ? { reason } : {} }), 'seekJob.decline.done')
}

// "Message" opens (or reopens) the chat with this applicant, then goes there. The first time it also drops a card about
// this job and offer into the thread.
async function message(applicant: JobApplicant) {
  busy.value = true
  try {
    const { conversationId } = await useApiFetch<{ conversationId: string }>(`/api/dashboard/job-post-applications/${applicant.id}/conversation`, { method: 'POST' })
    await navigateTo(localePath({ path: '/messages', query: { conversation: conversationId } }))
  }
  catch (e) {
    toast.error(jobError(e))
    busy.value = false
  }
}

// Coming from the "Hire" button on a chat card: open the hire dialog for that applicant straight away.
onMounted(async () => {
  const hire = route.query.hire
  if (typeof hire !== 'string' || !hire) return
  // Clear the param first so a refresh doesn't reopen the dialog.
  await navigateTo({ path: route.path, query: {} }, { replace: true })
  try {
    const applicant = await useApiFetch<JobApplicant>(`/api/dashboard/job-post-applications/${hire}`)
    if (applicant.can.hire) {
      hireError.value = ''
      hiring.value = applicant
    }
    else {
      toast.error(t('seekJob.errors.application_not_pending'))
    }
  }
  catch (e) {
    toast.error(jobError(e))
  }
})

useSeoMeta({ title: () => post.value?.title ?? t('seekJob.title') })
</script>

<template>
  <div
    v-if="post"
    class="flex flex-col gap-6"
  >
    <UiBackButton fallback="/seek-job" />

    <div class="flex flex-wrap items-start justify-between gap-4">
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <h1 class="font-display text-2xl font-bold">
            {{ post.title }}
          </h1>
          <DashboardJobPostStatusBadge :status="post.status" />
        </div>
        <p class="mt-1 text-xs text-black/50 dark:text-white/50">
          {{ post.categoryName }}<template v-if="post.categoryName">
            ·
          </template>{{ t('seekJob.card.posted', { when: relativeLabel(post.createdAt) }) }}
          <template v-if="post.lastEditedAt">
            · {{ t('seekJob.detail.lastEdited', { when: relativeLabel(post.lastEditedAt) }) }}
          </template>
        </p>
      </div>

      <div class="flex flex-wrap gap-2">
        <NuxtLinkLocale
          v-if="post.can.edit"
          :to="`/seek-job/${post.id}/edit`"
          :class="linkButtonClass('secondary')"
        >
          {{ t('seekJob.detail.actions.edit') }}
        </NuxtLinkLocale>
        <NuxtLinkLocale
          v-if="post.bookingId && post.status !== 'closed'"
          :to="{ path: '/purchases', query: { booking: post.bookingId } }"
          :class="linkButtonClass('secondary')"
        >
          {{ t('seekJob.detail.actions.viewBooking') }}
        </NuxtLinkLocale>
        <UiButton
          v-if="post.can.close"
          variant="ghost"
          :disabled="busy"
          @click="closePost"
        >
          {{ t('seekJob.detail.actions.close') }}
        </UiButton>
        <UiButton
          v-if="post.can.reopen"
          variant="primary"
          :disabled="busy"
          @click="reopenPost"
        >
          {{ t('seekJob.detail.actions.reopen') }}
        </UiButton>
        <UiButton
          v-if="post.can.delete"
          variant="ghost"
          class="text-red-600!"
          :disabled="busy"
          @click="deletePost"
        >
          {{ t('seekJob.detail.actions.delete') }}
        </UiButton>
      </div>
    </div>

    <p
      class="rounded-xl px-4 py-3 text-sm font-semibold"
      :class="BANNER_CLASS[banner.tone]"
    >
      {{ banner.text }}
    </p>

    <section class="grid gap-6 rounded-2xl border border-black/10 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_280px] dark:border-white/10">
      <div class="min-w-0">
        <p class="text-sm whitespace-pre-line text-black/80 dark:text-white/80">
          {{ post.description }}
        </p>
        <h2 class="mt-5 mb-2 text-xs font-bold tracking-wide text-black/40 uppercase dark:text-white/40">
          {{ t('seekJob.form.fields.tasks.label') }}
        </h2>
        <ul class="flex flex-col gap-1.5 text-sm">
          <li
            v-for="task in post.tasks"
            :key="task"
            class="flex items-start gap-2"
          >
            <UiIcon
              name="check"
              :size="14"
              class="mt-0.5 shrink-0 text-brand-600"
            />{{ task }}
          </li>
        </ul>
        <ul
          v-if="post.photos.length > 0"
          class="mt-5 grid grid-cols-3 gap-2.5 sm:grid-cols-4"
        >
          <li
            v-for="photo in post.photos"
            :key="photo.id"
            class="aspect-square overflow-hidden rounded-xl bg-black/5 dark:bg-white/10"
          >
            <img
              v-if="photo.available"
              :src="photo.url"
              :alt="post.title"
              loading="lazy"
              class="h-full w-full object-cover"
            >
            <span
              v-else
              class="flex h-full items-center justify-center p-2 text-center text-[11px] text-black/50 dark:text-white/50"
            >{{ t('seekJob.form.fields.photos.unavailable') }}</span>
          </li>
        </ul>
      </div>

      <dl class="flex flex-col gap-3.5 text-sm">
        <div>
          <dt class="text-xs text-black/50 dark:text-white/50">
            {{ t('seekJob.form.fields.location.label') }}
          </dt>
          <dd class="font-semibold">
            {{ placeLabel(post) }}
          </dd>
          <dd class="text-xs text-black/60 dark:text-white/60">
            {{ post.address }}
          </dd>
        </div>
        <div>
          <dt class="text-xs text-black/50 dark:text-white/50">
            {{ t('seekJob.form.fields.date.label') }}
          </dt>
          <dd class="font-semibold">
            {{ post.preferredDate ? dateLabel(post.preferredDate) : t('seekJob.card.anyDate') }} · {{ timeLabel(post.preferredTime) }}
          </dd>
        </div>
        <div>
          <dt class="text-xs text-black/50 dark:text-white/50">
            {{ t('seekJob.budget.label') }}
          </dt>
          <dd class="font-semibold">
            {{ budgetLabel(post.budget) }}
          </dd>
        </div>
      </dl>
    </section>

    <section class="flex flex-col gap-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 class="font-display text-xl font-bold">
          {{ t('seekJob.detail.applicants.heading') }}
        </h2>
        <div class="flex items-center gap-2 text-xs font-semibold text-black/60 dark:text-white/60">
          <label for="applicant-sort">{{ t('seekJob.detail.applicants.sort.label') }}</label>
          <select
            id="applicant-sort"
            v-model="sort"
            class="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs text-black outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
          >
            <option
              v-for="option in SORTS"
              :key="option"
              :value="option"
            >
              {{ t(`seekJob.detail.applicants.sort.${option}`) }}
            </option>
          </select>
        </div>
      </div>

      <DashboardFilterTabs
        :model-value="filter"
        :options="filterOptions"
        @update:model-value="filter = $event as typeof filter"
      />

      <div
        v-if="applicants.items.value.length > 0"
        class="flex flex-col gap-4"
      >
        <DashboardJobApplicantCard
          v-for="applicant in applicants.items.value"
          :key="applicant.id"
          :applicant="applicant"
          :busy="busy"
          @hire="hireError = ''; hiring = applicant"
          @decline="decline(applicant)"
          @message="message(applicant)"
        />
      </div>

      <div
        v-else
        class="rounded-2xl border border-dashed border-black/15 p-10 text-center dark:border-white/15"
      >
        <p class="font-display text-lg font-bold">
          {{ filter === 'active' && (counts?.pending ?? 0) + (counts?.hired ?? 0) === 0 ? t('seekJob.detail.applicants.emptyTitle') : t('seekJob.detail.applicants.emptyFilter') }}
        </p>
        <p
          v-if="filter === 'active'"
          class="mx-auto mt-1 max-w-sm text-sm text-black/60 dark:text-white/60"
        >
          {{ t('seekJob.detail.applicants.emptyHint') }}
        </p>
      </div>

      <DashboardLoadMore
        :shown="applicants.items.value.length"
        :total="applicants.meta.value?.total ?? 0"
        :has-more="applicants.hasMore.value"
        :loading="applicants.loadingMore.value"
        :failed="applicants.loadMoreFailed.value"
        @more="applicants.loadMore()"
      />
    </section>

    <DashboardJobHireModal
      :open="hiring !== null"
      :applicant="hiring"
      :post="post"
      :submitting="busy"
      :error="hireError"
      @close="hiring = null"
      @confirm="confirmHire"
    />

    <UiModal
      :open="isReopenOpen"
      @close="isReopenOpen = false"
    >
      <h2 class="mb-1.5 font-display text-xl font-bold">
        {{ t('seekJob.detail.reopen.dateTitle') }}
      </h2>
      <p class="mb-4 text-sm text-black/60 dark:text-white/60">
        {{ t('seekJob.detail.reopen.dateMessage') }}
      </p>
      <label
        for="reopen-date"
        class="mb-1.5 block text-xs font-bold"
      >{{ t('seekJob.detail.reopen.dateLabel') }}</label>
      <input
        id="reopen-date"
        v-model="reopenDate"
        type="date"
        :min="tomorrow"
        class="mb-5 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
      >
      <div class="flex justify-end gap-2.5">
        <UiButton
          variant="ghost"
          @click="isReopenOpen = false"
        >
          {{ t('seekJob.form.cancel') }}
        </UiButton>
        <UiButton
          variant="primary"
          :disabled="!reopenDate || busy"
          @click="reopenWithDate"
        >
          {{ t('seekJob.detail.reopen.confirm') }}
        </UiButton>
      </div>
    </UiModal>
  </div>
</template>
