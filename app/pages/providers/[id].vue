<script setup lang="ts">
import type { ProviderProfile, ServiceCategory } from '#shared/types/marketplace'

// Drill-down/detail screen: mobile gets a floating back button over the
// banner plus its own sticky Message/Book action bar instead of the app
// shell's tab bar (see `AppBottomNav`'s `hideBottomNav` meta flag).
definePageMeta({
  hideBottomNav: true,
})

const { t, locale } = useI18n()
const { money } = useSiteSettings()
const route = useRoute()
const router = useRouter()
const localePath = useLocalePath()
const authModal = useAuthModal()
const session = useSession()

function goBack() {
  if (window.history.length > 1) router.back()
  else navigateTo(localePath('/browse'))
}

const { data: provider, error } = await useApi<ProviderProfile>(`/providers/${route.params.id}`)

if (error.value || !provider.value) {
  throw createError({ statusCode: 404, statusMessage: t('marketplace.providerProfile.notFound'), fatal: true })
}

const { data: categories } = await useApi<ServiceCategory[]>('/categories')

const savedProviders = useSavedProviders()
await savedProviders.ensureLoaded()

const toast = useToast()
const isOpeningChat = ref(false)

// Your own profile shows the public view, without the actions that make no sense on yourself.
const isOwnProfile = computed(() => session.isAuthenticated.value && session.user.value?.id === provider.value?.userId)

// "Request a booking" opens the structured job-request form (logged-out
// visitors are asked to log in first — the request needs an account). An
// unverified provider can't send quotes yet, so the request would go nowhere.
const isJobRequestOpen = ref(false)
const requestedServiceId = ref<string | null>(null)
function startRequest(serviceId: string | null) {
  if (!provider.value?.verified || isOwnProfile.value) return
  if (!session.isAuthenticated.value) {
    authModal.open('login', { onSuccess: () => startRequest(serviceId) })
    return
  }
  // A plain "Request a booking" must not keep the service picked by an earlier per-service button.
  requestedServiceId.value = serviceId
  isJobRequestOpen.value = true
}
const openJobRequest = () => startRequest(null)

// "Message" / "Request a quote" / "Contact" all open (or create) the
// conversation with this provider — a booking request is layered on top of
// it later (see the job-request flow), so this stays one shared entry point.
async function handleMessage() {
  if (!session.isAuthenticated.value || !provider.value) {
    authModal.open('login', { onSuccess: () => handleMessage() })
    return
  }
  isOpeningChat.value = true
  try {
    const conversation = await useApiFetch<{ id: string }>('/api/dashboard/conversations', {
      method: 'POST',
      body: { providerId: Number(provider.value.id) },
    })
    await navigateTo(localePath({ path: '/messages', query: { conversation: conversation.id } }))
  }
  catch (error) {
    toast.error(apiErrorMessage(error, t('ui.errors.generic')))
  }
  finally {
    isOpeningChat.value = false
  }
}

const isSaving = ref(false)
async function handleToggleSave() {
  if (!session.isAuthenticated.value || !provider.value) {
    authModal.open('login', { onSuccess: () => handleToggleSave() })
    return
  }
  isSaving.value = true
  try {
    await savedProviders.toggle(provider.value.id)
  }
  catch (error) {
    toast.error(apiErrorMessage(error, t('ui.errors.generic')))
  }
  finally {
    isSaving.value = false
  }
}
const categoryIcon = computed(() => getCategoryIcon(categories.value ?? [], provider.value!.categoryId))
const categoryLabel = computed(() => provider.value!.categoryName)

// Skip parts the provider left empty instead of rendering ", , ".
const locationBreadcrumb = computed(() => {
  if (!provider.value) return ''
  return [provider.value.provinceName, provider.value.cityName, provider.value.barangay].filter(Boolean).join(', ')
})

const memberSinceLabel = computed(() => formatDate(provider.value!.memberSince, locale.value))

const lightboxIndex = ref<number | null>(null)
const isReportOpen = ref(false)

function openReport() {
  if (!session.isAuthenticated.value) {
    authModal.open('login', { onSuccess: () => openReport() })
    return
  }
  isReportOpen.value = true
}

// Native share sheet where it exists (phones); otherwise copy the link.
async function shareProfile() {
  const url = window.location.href
  try {
    if (navigator.share) {
      await navigator.share({ title: provider.value!.name, url })
      return
    }
    await navigator.clipboard.writeText(url)
    toast.success(t('marketplace.providerProfile.linkCopied'))
  }
  catch (error) {
    // Dismissing the share sheet rejects with AbortError — that's not a failure.
    if ((error as DOMException)?.name !== 'AbortError') toast.error(t('marketplace.providerProfile.shareFailed'))
  }
}

// Open the request form pre-selecting one of the provider's listed services.
const requestService = (serviceId: string) => startRequest(serviceId)

const availabilityText = computed(() => {
  const days = formatAvailabilityDays(provider.value?.availableDays ?? [], day => t(`dashboard.days.${day}`), t('marketplace.providerProfile.everyDay'))
  return days
    ? t('marketplace.providerProfile.availabilityFormatted', { days })
    : t('marketplace.providerProfile.availabilityUnavailable')
})

const pageTitle = computed(() => t('marketplace.providerProfile.seoTitle', {
  name: provider.value!.name,
  category: categoryLabel.value,
}))

useSeoMeta({
  title: pageTitle,
  description: t('marketplace.providerProfile.seoDescription', { name: provider.value!.name }),
})
defineOgImage('MarketplaceSatori', {
  title: provider.value!.name,
  eyebrow: categoryLabel,
  description: t('marketplace.providerProfile.seoDescription', { name: provider.value!.name }),
})
useSchemaOrg([defineWebPage()])
</script>

<template>
  <div v-if="provider">
    <div class="relative mx-auto max-w-6xl px-4 pt-8 sm:px-6 lg:px-10">
      <div class="h-[220px] w-full overflow-hidden rounded-3xl">
        <img
          v-if="provider.coverPhotoUrl"
          :src="provider.coverPhotoUrl"
          :alt="provider.name"
          class="h-full w-full object-cover"
        >
        <UiPlaceholderMedia
          v-else
          icon="image"
          label="1152 x 220"
        />
      </div>
      <button
        type="button"
        class="absolute top-12 left-8 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur-sm md:hidden dark:bg-black/70"
        :aria-label="t('marketplace.search.back')"
        @click="goBack"
      >
        <UiIcon
          name="chevron-left"
          :size="18"
        />
      </button>
    </div>

    <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-10">
      <div class="-mt-16 flex flex-col items-start gap-5 pb-6 sm:flex-row sm:items-end">
        <div class="h-[148px] w-[148px] shrink-0 overflow-hidden rounded-full border-4 border-white bg-brand-50 text-brand-700 shadow-lg dark:border-black dark:bg-brand-700/20 dark:text-brand-100">
          <img
            v-if="provider.avatarUrl"
            :src="provider.avatarUrl"
            :alt="provider.name"
            class="h-full w-full object-cover"
          >
          <UiPlaceholderMedia
            v-else
            :icon="categoryIcon"
          />
        </div>
        <div class="flex-1 pb-2">
          <div class="flex flex-wrap items-center gap-2.5">
            <h1 class="font-display text-2xl font-bold sm:text-3xl">
              {{ provider.name }}
            </h1>
            <UiTag
              v-if="provider.verified"
              variant="primary"
            >
              <UiIcon
                name="shield-check"
                filled
                :size="12"
              />
              {{ t('marketplace.providerProfile.verifiedPro') }}
            </UiTag>
          </div>
          <p
            v-if="provider.headline"
            class="mt-1 text-black/70 dark:text-white/70"
          >
            {{ provider.headline }}
          </p>
          <div class="mt-2 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-sm text-black/60 dark:text-white/60">
            <span>{{ categoryLabel }}</span>
            <span>&middot;</span>
            <UiRating
              :rating="provider.rating"
              :review-count="provider.reviewCount"
            />
            <span>&middot;</span>
            <span
              v-if="locationBreadcrumb"
              class="inline-flex items-center gap-1"
            >
              <UiIcon
                name="map-pin"
                :size="13"
              />{{ locationBreadcrumb }}
            </span>
          </div>
        </div>
        <div class="hidden gap-2.5 pb-2 md:flex">
          <UiButton
            v-if="!isOwnProfile"
            variant="ghost"
            :disabled="isOpeningChat"
            @click="handleMessage"
          >
            <UiIcon
              name="message"
              :size="16"
            />
            {{ t('marketplace.provider.message') }}
          </UiButton>
          <UiButton
            v-if="!isOwnProfile"
            variant="primary"
            :disabled="!provider.verified"
            @click="openJobRequest"
          >
            {{ t('marketplace.providerProfile.requestBooking') }}
          </UiButton>
          <button
            type="button"
            class="flex h-11 w-11 items-center justify-center rounded-full border border-black/10 text-black/40 transition-colors hover:text-black dark:border-white/10 dark:text-white/40 dark:hover:text-white"
            :aria-label="t('marketplace.providerProfile.share')"
            @click="shareProfile"
          >
            <UiIcon
              name="send"
              :size="17"
            />
          </button>
          <button
            v-if="!isOwnProfile"
            type="button"
            class="flex h-11 w-11 items-center justify-center rounded-full border border-black/10 transition-colors hover:text-red-600 disabled:opacity-50 dark:border-white/10 dark:hover:text-red-400"
            :class="savedProviders.isSaved(provider.id) ? 'text-red-600 dark:text-red-400' : 'text-black/40 dark:text-white/40'"
            :aria-label="savedProviders.isSaved(provider.id) ? t('marketplace.provider.unsave') : t('marketplace.provider.save')"
            :disabled="isSaving"
            @click="handleToggleSave"
          >
            <UiIcon
              name="heart"
              :filled="savedProviders.isSaved(provider.id)"
              :size="18"
            />
          </button>
        </div>
      </div>

      <div class="mb-10 grid grid-cols-2 gap-4 rounded-2xl border border-black/10 bg-white/70 px-6 py-6 backdrop-blur-xl dark:border-white/10 dark:bg-black/30 sm:grid-cols-4">
        <div class="text-center sm:border-r sm:border-black/10 sm:dark:border-white/10">
          <p class="font-display text-xl font-bold">
            {{ provider.jobsCompleted }}
          </p>
          <p class="mt-0.5 text-xs text-black/50 dark:text-white/50">
            {{ t('marketplace.providerProfile.stats.jobsCompleted') }}
          </p>
        </div>
        <div class="text-center sm:border-r sm:border-black/10 sm:dark:border-white/10">
          <p class="font-display text-xl font-bold">
            {{ t('marketplace.provider.yearsExperience', { years: provider.yearsExperience }) }}
          </p>
          <p class="mt-0.5 text-xs text-black/50 dark:text-white/50">
            {{ t('marketplace.providerProfile.stats.experience') }}
          </p>
        </div>
        <div class="text-center sm:border-r sm:border-black/10 sm:dark:border-white/10">
          <p class="font-display text-xl font-bold">
            {{ t('marketplace.providerProfile.stats.responseTimeValue', { hours: provider.responseTimeHours }) }}
          </p>
          <p class="mt-0.5 text-xs text-black/50 dark:text-white/50">
            {{ t('marketplace.providerProfile.stats.responseTime') }}
          </p>
        </div>
        <div class="text-center">
          <p class="font-display text-xl font-bold">
            {{ provider.repeatClientPercent }}%
          </p>
          <p class="mt-0.5 text-xs text-black/50 dark:text-white/50">
            {{ t('marketplace.providerProfile.stats.repeatClients') }}
          </p>
        </div>
      </div>

      <div class="grid gap-8 pb-20 md:grid-cols-[minmax(0,1fr)_280px] lg:grid-cols-[minmax(0,1fr)_340px]">
        <div class="flex flex-col gap-9">
          <div>
            <h2 class="mb-3.5 text-lg font-bold">
              {{ t('marketplace.providerProfile.about') }}
            </h2>
            <p
              v-if="provider.bio"
              class="text-black/60 dark:text-white/60"
            >
              {{ provider.bio }}
            </p>
            <p class="mt-2 text-xs text-black/40 dark:text-white/40">
              {{ t('marketplace.providerProfile.memberSince', { date: memberSinceLabel }) }}
            </p>
          </div>

          <div>
            <h2 class="mb-3.5 text-lg font-bold">
              {{ t('marketplace.providerProfile.skills') }}
            </h2>
            <div class="flex flex-wrap gap-2">
              <UiTag
                v-for="skill in provider.skills"
                :key="skill.id"
              >
                {{ skill.name }}
              </UiTag>
            </div>
          </div>

          <div v-if="provider.services.length > 0">
            <h2 class="mb-3.5 text-lg font-bold">
              {{ t('marketplace.providerProfile.services') }}
            </h2>
            <div class="flex flex-col gap-3">
              <div
                v-for="service in provider.services"
                :key="service.id"
                class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white/70 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-black/30"
              >
                <div class="min-w-0 flex-1">
                  <p class="font-bold">
                    {{ service.title }}
                  </p>
                  <p
                    v-if="service.description"
                    class="mt-0.5 text-sm text-black/60 dark:text-white/60"
                  >
                    {{ service.description }}
                  </p>
                  <p class="mt-1.5 text-sm font-semibold">
                    {{ service.priceType === 'hourly'
                      ? t('marketplace.providerProfile.priceHourly', { amount: money(service.priceAmount) })
                      : t('marketplace.providerProfile.priceFlat', { amount: money(service.priceAmount) }) }}
                    <span
                      v-if="service.durationLabel"
                      class="font-normal text-black/50 dark:text-white/50"
                    >· {{ service.durationLabel }}</span>
                  </p>
                </div>
                <UiButton
                  v-if="!isOwnProfile"
                  variant="ghost"
                  :disabled="!provider.verified"
                  @click="requestService(service.id)"
                >
                  {{ t('marketplace.providerProfile.requestService') }}
                </UiButton>
              </div>
            </div>
          </div>

          <div v-if="provider.workPhotos.length > 0">
            <h2 class="mb-3.5 text-lg font-bold">
              {{ t('marketplace.providerProfile.recentWork') }}
            </h2>
            <div class="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
              <button
                v-for="(photo, index) in provider.workPhotos"
                :key="photo.id"
                type="button"
                class="aspect-[4/3] overflow-hidden rounded-2xl"
                :aria-label="t('marketplace.providerProfile.openPhoto', { number: index + 1 })"
                @click="lightboxIndex = index"
              >
                <img
                  :src="photo.url"
                  :alt="t('marketplace.providerProfile.recentWork')"
                  loading="lazy"
                  class="h-full w-full object-cover transition-transform hover:scale-105"
                >
              </button>
            </div>
          </div>

          <MarketplaceProviderReviews
            :provider-id="provider.id"
            :rating="provider.rating"
            :total="provider.reviewsTotal"
            :breakdown="provider.ratingBreakdown"
            :initial-reviews="provider.reviews"
          />
        </div>

        <div class="flex flex-col gap-5">
          <div class="rounded-2xl border border-black/10 bg-white/70 p-6 backdrop-blur-xl dark:border-white/10 dark:bg-black/30">
            <div class="flex items-baseline justify-between">
              <p class="font-display text-2xl font-bold">
                {{ t('marketplace.provider.estimate', { rate: money(provider.ratePerHour) }) }}
              </p>
              <span
                v-if="provider.minVisitFee"
                class="text-xs text-black/50 dark:text-white/50"
              >
                {{ t('marketplace.providerProfile.minVisitFee', { fee: money(provider.minVisitFee) }) }}
              </span>
            </div>
            <div
              v-if="!isOwnProfile"
              class="mt-5 flex flex-col gap-2.5"
            >
              <UiButton
                variant="primary"
                :disabled="!provider.verified"
                @click="openJobRequest"
              >
                {{ t('marketplace.providerProfile.requestBooking') }}
              </UiButton>
              <p
                v-if="!provider.verified"
                class="text-xs font-semibold text-accent-700 dark:text-accent-100"
              >
                {{ t('marketplace.provider.pendingVerification') }}
              </p>
            </div>
            <p class="mt-2.5 text-xs text-black/50 dark:text-white/50">
              {{ t('marketplace.providerProfile.priceDisclaimer') }}
            </p>
            <div class="mt-5 flex flex-col gap-2.5 border-t border-black/10 pt-5 text-sm text-black/60 dark:border-white/10 dark:text-white/60">
              <p
                v-if="provider.verified"
                class="flex items-center gap-2.5"
              >
                <UiIcon
                  name="shield-check"
                  :size="16"
                  class="text-brand-700"
                />
                {{ t('marketplace.providerProfile.identityChecked') }}
              </p>
              <p class="flex items-center gap-2.5">
                <UiIcon
                  name="calendar"
                  :size="16"
                  class="text-brand-700"
                />
                {{ availabilityText }}
              </p>
            </div>
          </div>

          <div
            v-if="provider.serviceAreaKm !== null || provider.cityName"
            class="flex items-start gap-3 rounded-2xl border border-black/10 bg-white/70 p-5 text-sm text-black/60 backdrop-blur-xl dark:border-white/10 dark:bg-black/30 dark:text-white/60"
          >
            <UiIcon
              name="map-pin"
              :size="17"
              class="mt-0.5 shrink-0 text-brand-700"
            />
            <p>
              {{ provider.serviceAreaKm !== null && provider.cityName
                ? t('marketplace.providerProfile.serviceAreaFrom', { radius: provider.serviceAreaKm, city: provider.cityName })
                : provider.serviceAreaKm !== null
                  ? t('marketplace.providerProfile.serviceArea', { radius: provider.serviceAreaKm })
                  : t('marketplace.providerProfile.basedIn', { city: provider.cityName }) }}
            </p>
          </div>

          <button
            type="button"
            class="self-start text-xs text-black/40 underline hover:text-black/70 dark:text-white/40 dark:hover:text-white/70"
            @click="openReport"
          >
            {{ t('marketplace.providerProfile.reportProvider') }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="!isOwnProfile"
      class="fixed inset-x-0 bottom-0 z-40 flex gap-2.5 border-t border-black/10 bg-white/95 px-4 py-3 pb-safe backdrop-blur-xl md:hidden dark:border-white/10 dark:bg-black/90"
    >
      <UiButton
        variant="ghost"
        class="shrink-0 px-4!"
        :aria-label="t('marketplace.provider.message')"
        :disabled="isOpeningChat"
        @click="handleMessage"
      >
        <UiIcon
          name="message"
          :size="18"
        />
      </UiButton>
      <button
        type="button"
        class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-black/10 transition-colors disabled:opacity-50 dark:border-white/10"
        :class="savedProviders.isSaved(provider.id) ? 'text-red-600 dark:text-red-400' : 'text-black/40 dark:text-white/40'"
        :aria-label="savedProviders.isSaved(provider.id) ? t('marketplace.provider.unsave') : t('marketplace.provider.save')"
        :disabled="isSaving"
        @click="handleToggleSave"
      >
        <UiIcon
          name="heart"
          :filled="savedProviders.isSaved(provider.id)"
          :size="18"
        />
      </button>
      <UiButton
        variant="primary"
        class="flex-1 justify-center"
        :disabled="!provider.verified"
        @click="openJobRequest"
      >
        {{ t('marketplace.providerProfile.requestBooking') }} · {{ t('marketplace.provider.estimate', { rate: money(provider.ratePerHour) }) }}
      </UiButton>
    </div>

    <MarketplaceJobRequestModal
      :open="isJobRequestOpen"
      :provider-id="provider.id"
      :provider-name="provider.name"
      :services="provider.services"
      :service-id="requestedServiceId"
      @close="isJobRequestOpen = false"
    />
    <MarketplaceReportModal
      :open="isReportOpen"
      type="provider"
      :target-id="provider.id"
      @close="isReportOpen = false"
    />
    <UiLightbox
      :photos="provider.workPhotos"
      :index="lightboxIndex"
      :label="provider.name"
      @close="lightboxIndex = null"
      @update:index="(index) => (lightboxIndex = index)"
    />
  </div>
</template>
