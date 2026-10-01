<script setup lang="ts">
import type { KycState, ServiceListMeta, ServiceListing } from '#shared/types/dashboard'
import type { ServiceCategory } from '#shared/types/marketplace'
import type { ServiceFormSubmitPayload } from '~/components/dashboard/ServiceFormModal.vue'

// Reached from Home's quick tiles or the More sheet, never a bottom-nav tab
// — mobile gets a back button instead of the tab bar (see `UiBackButton`).
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'provider'],
  hideBottomNav: true,
})

const { t } = useI18n()
const toast = useToast()
const { confirm } = useConfirm()

const list = await usePagedList<ServiceListing, ServiceListMeta>('/dashboard/services', {
  key: 'dashboard-services',
  perPage: 20,
})
const refresh = list.refresh
const { data: categories } = await useApi<ServiceCategory[]>('/categories', {
  key: 'categories',
  default: () => [],
})

const listings = list.items

// Listings of an unverified provider are saved but stay paused (the server
// enforces it), so say so instead of letting "Active" silently not stick.
const { data: kyc } = useApi<KycState>('/dashboard/kyc', {
  key: 'dashboard-kyc',
  lazy: true,
  server: false,
})
const needsVerification = computed(() => kyc.value !== null && kyc.value !== undefined && !kyc.value.isVerified)

async function toggleStatus(id: string) {
  const service = listings.value.find(item => item.id === id)
  if (!service) return

  try {
    await useApiFetch(`/api/dashboard/services/${id}`, {
      method: 'PUT',
      body: { ...toServicePayload(service), status: service.status === 'active' ? 'paused' : 'active' },
    })
    await refresh()
  }
  catch (error) {
    toast.error(apiErrorMessage(error, t('dashboard.services.errors.update')))
  }
}

async function deleteService(service: ServiceListing) {
  const confirmed = await confirm({
    title: t('dashboard.services.deleteConfirm.title', { name: service.title }),
    message: t('dashboard.services.deleteConfirm.message'),
    confirmLabel: t('dashboard.services.delete'),
    tone: 'danger',
  })
  if (!confirmed) return

  try {
    await useApiFetch(`/api/dashboard/services/${service.id}`, { method: 'DELETE' })
    await refresh()
    toast.success(t('dashboard.services.deleted'))
  }
  catch (error) {
    toast.error(apiErrorMessage(error, t('dashboard.services.errors.delete')))
  }
}

function toServicePayload(service: ServiceListing): ServiceFormSubmitPayload {
  return {
    title: service.title,
    categoryId: service.categoryId,
    description: service.description,
    durationLabel: service.durationLabel,
    priceType: service.priceType,
    priceAmount: service.priceAmount,
  }
}

// Headline numbers come from the server (they cover every listing, not just the loaded ones).
const totals = computed(() => list.meta.value?.totals ?? { active: 0, bookings: 0, averageRating: null })
const averageRating = computed(() => totals.value.averageRating === null ? '—' : totals.value.averageRating.toFixed(1))

// --- Add/edit form + preview modals ----------------------------------------

const isFormOpen = ref(false)
const editingService = ref<ServiceListing | null>(null)
const isPreviewOpen = ref(false)
const previewingService = ref<ServiceListing | null>(null)

function openCreateForm() {
  formErrors.value = {}
  editingService.value = null
  isFormOpen.value = true
}

function openEditForm(service: ServiceListing) {
  formErrors.value = {}
  editingService.value = service
  isFormOpen.value = true
}

function openPreview(service: ServiceListing) {
  previewingService.value = service
  isPreviewOpen.value = true
}

const isSaving = ref(false)
const formErrors = ref<Record<string, string>>({})

async function handleFormSubmit(payload: ServiceFormSubmitPayload) {
  isSaving.value = true
  formErrors.value = {}
  const isEditing = Boolean(editingService.value)
  try {
    if (editingService.value) {
      await useApiFetch(`/api/dashboard/services/${editingService.value.id}`, {
        method: 'PUT',
        body: { ...payload, status: editingService.value.status },
      })
    }
    else {
      await useApiFetch('/api/dashboard/services', { method: 'POST', body: payload })
    }
    await refresh()
    isFormOpen.value = false
    toast.success(t(isEditing ? 'dashboard.services.updated' : 'dashboard.services.created'))
  }
  catch (error) {
    // Stay open with the server's per-field messages; a failure with none shows as a form-level error.
    formErrors.value = apiFieldErrors(error)
    if (Object.keys(formErrors.value).length === 0) formErrors.value = { form: apiErrorMessage(error, t('dashboard.services.errors.save')) }
  }
  finally {
    isSaving.value = false
  }
}

useSeoMeta({
  title: t('dashboard.services.title'),
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <UiBackButton fallback="/" />
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="font-display text-2xl font-bold">
          {{ t('dashboard.services.title') }}
        </h1>
        <p class="mt-0.5 text-sm text-black/60 dark:text-white/60">
          {{ t('dashboard.services.subtitle') }}
        </p>
      </div>
      <UiButton
        variant="primary"
        @click="openCreateForm"
      >
        <UiIcon
          name="plus"
          :size="15"
        />{{ t('dashboard.services.addService') }}
      </UiButton>
    </div>

    <NuxtLinkLocale
      v-if="needsVerification"
      :to="{ path: '/profile', query: { tab: 'kyc' } }"
      class="flex items-start gap-3 rounded-2xl border border-accent-600/30 bg-accent-50 p-4 text-sm dark:bg-accent-700/10"
    >
      <UiIcon
        name="alert-triangle"
        :size="18"
        class="mt-0.5 shrink-0 text-accent-700 dark:text-accent-100"
      />
      <span>
        <span class="block font-bold">{{ t('dashboard.services.unverified.title') }}</span>
        <span class="text-black/60 dark:text-white/60">{{ t('dashboard.services.unverified.body') }}</span>
      </span>
    </NuxtLinkLocale>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <DashboardStatCard
        :label="t('dashboard.services.summary.active')"
        :value="String(totals.active)"
      />
      <DashboardStatCard
        :label="t('dashboard.services.summary.bookings')"
        :value="String(totals.bookings)"
      />
      <DashboardStatCard
        :label="t('dashboard.services.summary.rating')"
        :value="averageRating"
      />
    </div>

    <div class="grid grid-cols-1 gap-5 md:grid-cols-2">
      <DashboardServiceCard
        v-for="service in listings"
        :key="service.id"
        :service="service"
        :needs-verification="needsVerification"
        @toggle-status="toggleStatus"
        @edit="openEditForm"
        @preview="openPreview"
        @delete="deleteService"
      />
      <div
        v-if="listings.length === 0"
        class="col-span-full rounded-2xl border border-dashed border-black/15 p-10 text-center dark:border-white/15"
      >
        <p class="text-sm text-black/60 dark:text-white/60">
          {{ t('dashboard.services.empty') }}
        </p>
        <UiButton
          class="mt-4"
          variant="primary"
          @click="openCreateForm"
        >
          {{ t('dashboard.services.addService') }}
        </UiButton>
      </div>
    </div>

    <DashboardLoadMore
      :shown="listings.length"
      :total="list.meta.value?.total ?? 0"
      :has-more="list.hasMore.value"
      :loading="list.loadingMore.value"
      :failed="list.loadMoreFailed.value"
      @more="list.loadMore()"
    />

    <DashboardServiceFormModal
      :open="isFormOpen"
      :categories="categories ?? []"
      :service="editingService"
      :submitting="isSaving"
      :errors="formErrors"
      @close="isFormOpen = false"
      @submit="handleFormSubmit"
    />
    <DashboardServicePreviewModal
      :open="isPreviewOpen"
      :service="previewingService"
      @close="isPreviewOpen = false"
    />
  </div>
</template>
