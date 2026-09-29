<script setup lang="ts">
import type { ServiceListing } from '#shared/types/dashboard'
import type { ServiceCategory } from '#shared/types/marketplace'
import type { ServiceFormSubmitPayload } from '~/components/dashboard/ServiceFormModal.vue'

// Reached from Home's quick tiles or the More sheet, never a bottom-nav tab
// — mobile gets a back button instead of the tab bar (see `UiBackButton`).
definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
  hideBottomNav: true,
})

const { t } = useI18n()

const { data: services, refresh } = await useApi<ServiceListing[]>('/dashboard/services', {
  key: 'dashboard-services',
  default: () => [],
})
const { data: categories } = await useApi<ServiceCategory[]>('/categories', {
  key: 'categories',
  default: () => [],
})

const listings = computed(() => services.value ?? [])

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
    console.error('Failed to update service status', error)
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

const activeCount = computed(() => listings.value.filter(service => service.status === 'active').length)
const totalBookings = computed(() => listings.value.reduce((sum, service) => sum + service.bookingsCount, 0))
const averageRating = computed(() => {
  if (listings.value.length === 0) return 0
  return listings.value.reduce((sum, service) => sum + service.rating, 0) / listings.value.length
})

// --- Add/edit form + preview modals ----------------------------------------

const isFormOpen = ref(false)
const editingService = ref<ServiceListing | null>(null)
const isPreviewOpen = ref(false)
const previewingService = ref<ServiceListing | null>(null)

function openCreateForm() {
  editingService.value = null
  isFormOpen.value = true
}

function openEditForm(service: ServiceListing) {
  editingService.value = service
  isFormOpen.value = true
}

function openPreview(service: ServiceListing) {
  previewingService.value = service
  isPreviewOpen.value = true
}

async function handleFormSubmit(payload: ServiceFormSubmitPayload) {
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
  }
  catch (error) {
    console.error('Failed to save service', error)
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

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <DashboardStatCard
        :label="t('dashboard.services.summary.active')"
        :value="String(activeCount)"
      />
      <DashboardStatCard
        :label="t('dashboard.services.summary.bookings')"
        :value="String(totalBookings)"
      />
      <DashboardStatCard
        :label="t('dashboard.services.summary.rating')"
        :value="averageRating.toFixed(1)"
      />
    </div>

    <div class="grid grid-cols-1 gap-5 md:grid-cols-2">
      <DashboardServiceCard
        v-for="service in listings"
        :key="service.id"
        :service="service"
        @toggle-status="toggleStatus"
        @edit="openEditForm"
        @preview="openPreview"
      />
    </div>

    <DashboardServiceFormModal
      :open="isFormOpen"
      :categories="categories ?? []"
      :service="editingService"
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
