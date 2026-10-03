<script setup lang="ts">
import type { DashboardSummary, ProviderProfileDetail, RecentWorkPhoto } from '#shared/types/dashboard'
import type { ServiceCategory } from '#shared/types/marketplace'

// Reached from Home's quick tiles or the More sheet, never a bottom-nav tab
// — mobile gets a back button instead of the tab bar (see `UiBackButton`).
definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
  hideBottomNav: true,
})

const { t, locale } = useI18n()
const { symbol } = useSiteSettings()
const localePath = useLocalePath()
const toast = useToast()
const { confirm } = useConfirm()

const { data: profile, error: profileError, refresh: refreshProfile } = await useApi<ProviderProfileDetail>('/dashboard/profile', {
  key: 'dashboard-profile',
})

// Only providers have a profile to edit — everyone else is sent to the
// explicit "Become a provider" onboarding instead of getting one by accident.
if (profileError.value && apiErrorStatus(profileError.value) === 404) {
  await navigateTo(localePath('/become-a-provider'), { replace: true })
}
const { data: summary, refresh: refreshSummary } = await useApi<DashboardSummary>('/dashboard/summary', {
  key: 'dashboard-summary-provider',
  query: { role: 'provider' },
})
const { data: categories } = await useApi<ServiceCategory[]>('/categories', {
  key: 'categories-with-skills',
  query: { include: 'skills' },
  default: () => [],
})

// The active tab lives in the URL (`?tab=kyc`), not local state, so the
// sidebar's "Verification" link can both open this tab directly and know
// when to highlight itself instead of "My profile" — see `layouts/dashboard.vue`.
const route = useRoute()
const router = useRouter()

const activeTab = computed<'details' | 'kyc' | 'reviews'>(() => {
  if (route.query.tab === 'kyc') return 'kyc'
  if (route.query.tab === 'reviews') return 'reviews'
  return 'details'
})

function setTab(tab: 'details' | 'kyc' | 'reviews') {
  const query = { ...route.query }
  if (tab === 'details') delete query.tab
  else query.tab = tab
  router.replace({ query })
}

/** The sidebar's KYC badge (`layouts/dashboard.vue`) reads a separate, independently-keyed fetch — refreshing just the summary leaves it stale after a new submission. */
function onKycSubmitted() {
  refreshSummary()
  refreshNuxtData('dashboard-kyc')
}

// Editable copy of the fetched profile — "Save changes" PUTs this to
// `/dashboard/profile` and "Cancel" discards edits by re-syncing from the
// last-fetched `profile`. Every field the public provider page
// (`providers/[id].vue`) shows is
// editable here except the ones that are actually system-computed from real
// activity (rating, review count, jobs/clients served, the reviews
// themselves) — those stay read-only in the summary card below.
const form = reactive({
  fullName: '',
  headline: '',
  bio: '',
  phone: '',
  email: '',
  provinceCode: null as string | null,
  cityCode: null as string | null,
  barangay: null as string | null,
  address: '',
  categoryId: null as string | null,
  yearsExperience: 0,
  hourlyRateUsd: 0,
  minVisitFeeUsd: null as number | null,
  responseTimeHours: 24,
  serviceAreaKm: null as number | null,
})

const photoUrl = ref<string | null>(null)
const coverPhotoUrl = ref<string | null>(null)
const skillIds = ref<string[]>([])
const availableDays = ref<string[]>([])
const recentWorkPhotos = ref<RecentWorkPhoto[]>([])

function syncFormFromProfile() {
  if (!profile.value) return
  form.fullName = profile.value.fullName
  form.headline = profile.value.headline ?? ''
  form.bio = profile.value.bio ?? ''
  form.phone = profile.value.phone ?? ''
  form.email = profile.value.email
  form.provinceCode = profile.value.provinceCode
  form.cityCode = profile.value.cityCode
  form.barangay = profile.value.barangay
  form.address = profile.value.address ?? ''
  form.categoryId = profile.value.categoryId
  form.yearsExperience = profile.value.yearsExperience
  form.hourlyRateUsd = profile.value.hourlyRateUsd
  form.minVisitFeeUsd = profile.value.minVisitFeeUsd
  form.responseTimeHours = profile.value.responseTimeHours
  form.serviceAreaKm = profile.value.serviceAreaKm
  availableDays.value = [...profile.value.availableDays]
  photoUrl.value = profile.value.photoUrl
  coverPhotoUrl.value = profile.value.coverPhotoUrl
  skillIds.value = [...profile.value.skillIds]
  recentWorkPhotos.value = [...profile.value.recentWorkPhotos]
}

watch(profile, syncFormFromProfile, { immediate: true })

const categoryOptions = computed(() =>
  (categories.value ?? []).map(category => ({ value: category.id, label: category.name })),
)

// Skills belong to a category; only the selected category's active skills
// can be added (the server enforces the same rule).
const categorySkills = computed(() =>
  (categories.value ?? []).find(category => category.id === form.categoryId)?.skills ?? [],
)

const skillLabel = (id: string) => categorySkills.value.find(skill => skill.id === id)?.name ?? id

const skillOptions = computed(() =>
  categorySkills.value
    .filter(skill => !skillIds.value.includes(skill.id))
    .map(skill => ({ value: skill.id, label: skill.name })),
)

// Switching category drops skills that don't belong to the new one.
watch(() => form.categoryId, () => {
  const allowed = new Set(categorySkills.value.map(skill => skill.id))
  skillIds.value = skillIds.value.filter(id => allowed.has(id))
})

const skillToAdd = ref<string | null>(null)

function addSkill() {
  if (!skillToAdd.value) return
  skillIds.value = [...skillIds.value, skillToAdd.value]
  skillToAdd.value = null
}

function removeSkill(id: string) {
  skillIds.value = skillIds.value.filter(skillId => skillId !== id)
}

const ALL_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const

function toggleDay(day: string) {
  availableDays.value = availableDays.value.includes(day)
    ? availableDays.value.filter(d => d !== day)
    : [...availableDays.value, day]
}

const availabilityPreview = computed(() => {
  const days = formatAvailabilityDays(availableDays.value, day => t(`dashboard.days.${day}`), t('marketplace.providerProfile.everyDay'))
  return days ? t('marketplace.providerProfile.availabilityFormatted', { days }) : t('marketplace.providerProfile.availabilityUnavailable')
})

const avatarInput = useTemplateRef('avatarInput')
const coverInput = useTemplateRef('coverInput')
const recentWorkInput = useTemplateRef('recentWorkInput')

const { uploadImage } = useImageUpload()

async function onAvatarChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  const result = await uploadImage<{ url: string }>('/api/dashboard/profile/avatar', file)
  if (!result) return
  photoUrl.value = result.url
  // Header/menus read the avatar from the session user.
  await useSession().fetchUser()
}

async function onCoverChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  const result = await uploadImage<{ url: string }>('/api/dashboard/profile/cover', file)
  if (result) coverPhotoUrl.value = result.url
}

async function onRecentWorkChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || recentWorkPhotos.value.length >= 6) return
  const result = await uploadImage<{ id: string, url: string }>('/api/dashboard/profile/work-photos', file)
  if (result) recentWorkPhotos.value = [...recentWorkPhotos.value, { id: String(result.id), url: result.url }]
}

async function removeRecentWork(index: number) {
  const photo = recentWorkPhotos.value[index]
  if (!photo) return
  const confirmed = await confirm({
    title: t('dashboard.profile.removePhotoConfirm.title'),
    message: t('dashboard.profile.removePhotoConfirm.message'),
    confirmLabel: t('dashboard.profile.removePhoto'),
    tone: 'danger',
  })
  if (!confirmed) return
  try {
    await useApiFetch(`/api/dashboard/profile/work-photos/${photo.id}`, { method: 'DELETE' })
    recentWorkPhotos.value = recentWorkPhotos.value.filter((_, i) => i !== index)
  }
  catch (error) {
    toast.error(apiErrorMessage(error, t('dashboard.profile.errors.upload')))
  }
}

const memberSinceLabel = computed(() => {
  if (!profile.value) return ''
  return new Intl.DateTimeFormat(locale.value, { month: 'long', year: 'numeric' }).format(new Date(profile.value.memberSince))
})

/** Parses a typed money amount, keeping decimals ("12.50"); empty input is `null`. */
function parseMoney(value: string): number | null {
  const cleaned = value.replace(/[^\d.]/g, '')
  if (cleaned === '' || cleaned === '.') return null
  const amount = Number.parseFloat(cleaned)
  return Number.isFinite(amount) ? amount : null
}

const justSaved = ref(false)
const isSaving = ref(false)
const fieldErrors = ref<Record<string, string>>({})

async function handleSave() {
  isSaving.value = true
  fieldErrors.value = {}
  try {
    await useApiFetch('/api/dashboard/profile', {
      method: 'PUT',
      body: {
        fullName: form.fullName,
        headline: form.headline || null,
        bio: form.bio || null,
        phone: form.phone || null,
        ...(form.categoryId ? { categoryId: form.categoryId } : {}),
        skillIds: skillIds.value,
        yearsExperience: form.yearsExperience,
        hourlyRateUsd: form.hourlyRateUsd,
        minVisitFeeUsd: form.minVisitFeeUsd,
        responseTimeHours: form.responseTimeHours,
        serviceAreaKm: form.serviceAreaKm,
        availableDays: availableDays.value,
        provinceCode: form.provinceCode,
        cityCode: form.cityCode,
        barangay: form.barangay,
        address: form.address || null,
      },
    })
    await refreshProfile()
    justSaved.value = true
    setTimeout(() => (justSaved.value = false), 2500)
  }
  catch (error) {
    fieldErrors.value = apiFieldErrors(error)
    const firstFieldError = Object.values(fieldErrors.value)[0]
    toast.error(firstFieldError ?? apiErrorMessage(error, t('dashboard.profile.errors.save')))
  }
  finally {
    isSaving.value = false
  }
}

useSeoMeta({
  title: t('dashboard.profile.title'),
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <UiBackButton fallback="/" />
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="font-display text-2xl font-bold">
          {{ t('dashboard.profile.title') }}
        </h1>
        <p class="mt-0.5 text-sm text-black/60 dark:text-white/60">
          {{ t('dashboard.profile.subtitle') }}
        </p>
      </div>
    </div>

    <div class="flex gap-7 border-b border-black/10 dark:border-white/10">
      <button
        type="button"
        class="border-b-2 pb-3 text-sm font-bold transition-colors"
        :class="activeTab === 'details' ? 'border-brand-600 text-black dark:text-white' : 'border-transparent text-black/40 dark:text-white/40'"
        @click="setTab('details')"
      >
        {{ t('dashboard.profile.tabs.details') }}
      </button>
      <button
        type="button"
        class="border-b-2 pb-3 text-sm font-bold transition-colors"
        :class="activeTab === 'kyc' ? 'border-brand-600 text-black dark:text-white' : 'border-transparent text-black/40 dark:text-white/40'"
        @click="setTab('kyc')"
      >
        {{ t('dashboard.profile.tabs.kyc') }}
      </button>
      <button
        type="button"
        class="border-b-2 pb-3 text-sm font-bold transition-colors"
        :class="activeTab === 'reviews' ? 'border-brand-600 text-black dark:text-white' : 'border-transparent text-black/40 dark:text-white/40'"
        @click="setTab('reviews')"
      >
        {{ t('dashboard.profile.tabs.reviews') }}
      </button>
    </div>

    <MarketplaceProviderReviews
      v-if="activeTab === 'reviews' && profile"
      :provider-id="profile.id"
      :rating="profile.averageRating"
      :total="profile.reviewsTotal"
      :breakdown="profile.ratingBreakdown"
      :initial-reviews="profile.reviews"
    />

    <template v-else-if="activeTab === 'details' && profile">
      <div class="overflow-hidden rounded-2xl border border-black/10 dark:border-white/10">
        <div
          class="relative flex h-36 items-end justify-end bg-black/5 p-3 dark:bg-white/10"
          :style="coverPhotoUrl ? { backgroundImage: `url(${coverPhotoUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}"
        >
          <UiButton
            variant="secondary"
            size="sm"
            @click="coverInput?.click()"
          >
            <UiIcon
              name="camera"
              :size="14"
            />{{ coverPhotoUrl ? t('dashboard.profile.changeCoverPhoto') : t('dashboard.profile.addCoverPhoto') }}
          </UiButton>
          <input
            ref="coverInput"
            type="file"
            accept="image/*"
            class="hidden"
            :aria-label="t('dashboard.profile.coverPhoto')"
            @change="onCoverChange"
          >
        </div>
      </div>

      <div class="grid grid-cols-1 gap-5 lg:grid-cols-[320px_1fr]">
        <div class="flex flex-col items-center gap-3.5 rounded-2xl border border-black/10 p-5 text-center sm:p-6 dark:border-white/10">
          <NuxtImg
            v-if="photoUrl"
            :src="photoUrl"
            :alt="form.fullName"
            class="h-24 w-24 rounded-full object-cover"
          />
          <span
            v-else
            class="flex h-24 w-24 items-center justify-center rounded-full bg-brand-600 font-display text-3xl font-bold text-white"
          >
            {{ initialsFor(profile.fullName) }}
          </span>
          <UiButton
            variant="ghost"
            @click="avatarInput?.click()"
          >
            <UiIcon
              name="camera"
              :size="15"
            />{{ t('dashboard.profile.changePhoto') }}
          </UiButton>
          <input
            ref="avatarInput"
            type="file"
            accept="image/*"
            class="hidden"
            :aria-label="t('dashboard.profile.changePhoto')"
            @change="onAvatarChange"
          >
          <div class="w-full space-y-2 border-t border-black/10 pt-3.5 text-left dark:border-white/10">
            <div class="flex items-center gap-2 text-[13px] text-black/60 dark:text-white/60">
              <UiIcon
                name="star"
                filled
                :size="15"
                class="text-accent-600"
              />
              {{ t('dashboard.profile.ratingSummary', { rating: profile.averageRating.toFixed(1), count: profile.reviewCount }) }}
            </div>
            <div class="flex items-center gap-2 text-[13px] text-black/60 dark:text-white/60">
              <UiIcon
                name="users"
                :size="15"
              />
              {{ t('dashboard.profile.clientsServedSummary', { count: profile.clientsServed }) }}
            </div>
            <div class="flex items-center gap-2 text-[13px] text-black/60 dark:text-white/60">
              <UiIcon
                name="calendar"
                :size="15"
              />
              {{ t('dashboard.profile.memberSince', { date: memberSinceLabel }) }}
            </div>
          </div>
        </div>

        <div class="flex flex-col gap-5">
          <UiCollapsibleSection
            :title="t('dashboard.profile.sections.basicInfo')"
            default-open
          >
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  for="profile-full-name"
                  class="mb-2 block text-xs font-bold"
                >{{ t('dashboard.profile.fields.fullName') }}</label>
                <UiInput
                  id="profile-full-name"
                  v-model="form.fullName"
                />
              </div>
              <div>
                <label
                  for="profile-headline"
                  class="mb-2 block text-xs font-bold"
                >{{ t('dashboard.profile.fields.headline') }}</label>
                <UiInput
                  id="profile-headline"
                  v-model="form.headline"
                />
              </div>
              <div class="sm:col-span-2">
                <label
                  for="profile-bio"
                  class="mb-2 block text-xs font-bold"
                >{{ t('dashboard.profile.fields.bio') }}</label>
                <textarea
                  id="profile-bio"
                  v-model="form.bio"
                  rows="3"
                  class="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
                />
              </div>
              <div>
                <label
                  for="profile-phone"
                  class="mb-2 block text-xs font-bold"
                >{{ t('dashboard.profile.fields.phone') }}</label>
                <UiInput
                  id="profile-phone"
                  v-model="form.phone"
                  type="tel"
                />
              </div>
              <div>
                <label
                  for="profile-email"
                  class="mb-2 block text-xs font-bold"
                >{{ t('dashboard.profile.fields.email') }}</label>
                <UiInput
                  id="profile-email"
                  v-model="form.email"
                  type="email"
                  disabled
                  class="opacity-60"
                />
                <p class="mt-1.5 text-xs text-black/50 dark:text-white/50">
                  {{ t('dashboard.profile.fields.emailHelp') }}
                </p>
              </div>
              <div>
                <label
                  for="profile-years-experience"
                  class="mb-2 block text-xs font-bold"
                >{{ t('dashboard.profile.fields.yearsExperience') }}</label>
                <UiInput
                  id="profile-years-experience"
                  :model-value="String(form.yearsExperience)"
                  @update:model-value="(v) => (form.yearsExperience = Number(v.replace(/\D/g, '')) || 0)"
                />
              </div>
              <UiLocationPicker
                id="profile-location"
                v-model:province="form.provinceCode"
                v-model:city="form.cityCode"
                v-model:barangay="form.barangay"
                variant="form"
              />
              <div>
                <label
                  for="profile-address"
                  class="mb-2 block text-xs font-bold"
                >{{ t('dashboard.profile.fields.address') }}</label>
                <UiInput
                  id="profile-address"
                  v-model="form.address"
                  icon="map-pin"
                  :placeholder="t('dashboard.profile.fields.addressPlaceholder')"
                />
              </div>
            </div>
          </UiCollapsibleSection>

          <UiCollapsibleSection :title="t('dashboard.profile.sections.skills')">
            <div class="mb-3">
              <label
                for="profile-category"
                class="mb-2 block text-xs font-bold"
              >{{ t('dashboard.profile.fields.primaryCategory') }}</label>
              <UiSelectSearch
                id="profile-category"
                v-model="form.categoryId"
                :options="categoryOptions"
                :placeholder="t('dashboard.services.form.categoryPlaceholder')"
                class="max-w-xs"
              />
            </div>
            <span class="mb-2 block text-xs font-bold">{{ t('dashboard.profile.fields.skills') }}</span>
            <div class="flex flex-wrap items-center gap-2">
              <UiTag
                v-for="skillId in skillIds"
                :key="skillId"
                variant="primary"
              >
                {{ skillLabel(skillId) }}
                <button
                  type="button"
                  :aria-label="t('dashboard.profile.removeSkill')"
                  @click="removeSkill(skillId)"
                >
                  <UiIcon
                    name="x"
                    :size="11"
                  />
                </button>
              </UiTag>
            </div>
            <div class="mt-3 flex items-center gap-2">
              <UiSelectSearch
                v-model="skillToAdd"
                :options="skillOptions"
                :placeholder="categorySkills.length ? t('dashboard.profile.addSkillPlaceholder') : t('dashboard.profile.pickCategoryFirst')"
                class="max-w-xs flex-1"
              />
              <UiButton
                variant="ghost"
                size="sm"
                :disabled="!skillToAdd"
                @click="addSkill"
              >
                <UiIcon
                  name="plus"
                  :size="13"
                />{{ t('dashboard.profile.addSkill') }}
              </UiButton>
            </div>
          </UiCollapsibleSection>

          <UiCollapsibleSection :title="t('dashboard.profile.sections.rateAvailability')">
            <div class="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label
                  for="profile-hourly-rate"
                  class="mb-2 block text-xs font-bold"
                >{{ t('dashboard.profile.fields.hourlyRate') }}</label>
                <UiInput
                  id="profile-hourly-rate"
                  :model-value="`${symbol}${form.hourlyRateUsd}`"
                  inputmode="decimal"
                  @update:model-value="(v) => (form.hourlyRateUsd = parseMoney(v) ?? 0)"
                />
                <p
                  v-if="fieldErrors.hourlyRateUsd"
                  class="mt-1.5 text-xs text-red-600 dark:text-red-400"
                >
                  {{ fieldErrors.hourlyRateUsd }}
                </p>
                <p class="mt-1.5 text-xs text-black/50 dark:text-white/50">
                  {{ t('dashboard.profile.fields.hourlyRateHelp') }}
                </p>
              </div>
              <div>
                <label
                  for="profile-min-visit-fee"
                  class="mb-2 block text-xs font-bold"
                >{{ t('dashboard.profile.fields.minVisitFee') }}</label>
                <UiInput
                  id="profile-min-visit-fee"
                  :model-value="form.minVisitFeeUsd === null ? '' : `${symbol}${form.minVisitFeeUsd}`"
                  inputmode="decimal"
                  placeholder="—"
                  @update:model-value="(v) => (form.minVisitFeeUsd = parseMoney(v))"
                />
              </div>
              <div>
                <label
                  for="profile-response-time"
                  class="mb-2 block text-xs font-bold"
                >{{ t('dashboard.profile.fields.responseTime') }}</label>
                <UiInput
                  id="profile-response-time"
                  :model-value="String(form.responseTimeHours)"
                  inputmode="numeric"
                  @update:model-value="(v) => (form.responseTimeHours = Math.min(168, Math.max(1, Number(v.replace(/\D/g, '')) || 1)))"
                />
                <p class="mt-1.5 text-xs text-black/50 dark:text-white/50">
                  {{ t('dashboard.profile.fields.responseTimeHelp') }}
                </p>
              </div>
              <div>
                <label
                  for="profile-service-area"
                  class="mb-2 block text-xs font-bold"
                >{{ t('dashboard.profile.fields.serviceArea') }}</label>
                <UiInput
                  id="profile-service-area"
                  :model-value="form.serviceAreaKm === null ? '' : String(form.serviceAreaKm)"
                  inputmode="numeric"
                  placeholder="—"
                  @update:model-value="(v) => (form.serviceAreaKm = v.replace(/\D/g, '') === '' ? null : Math.min(500, Number(v.replace(/\D/g, ''))))"
                />
                <p class="mt-1.5 text-xs text-black/50 dark:text-white/50">
                  {{ t('dashboard.profile.fields.serviceAreaHelp') }}
                </p>
              </div>
            </div>
            <span class="mb-2 block text-xs font-bold">{{ t('dashboard.profile.fields.availability') }}</span>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="day in ALL_DAYS"
                :key="day"
                type="button"
                class="rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors"
                :class="availableDays.includes(day)
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-700/20 dark:text-brand-100'
                  : 'bg-black/5 text-black/40 dark:bg-white/10 dark:text-white/40'"
                @click="toggleDay(day)"
              >
                {{ t(`dashboard.days.${day}`) }}
              </button>
            </div>
            <p class="mt-2.5 text-xs text-black/50 dark:text-white/50">
              {{ t('dashboard.profile.fields.availabilityPreview', { text: availabilityPreview }) }}
            </p>
          </UiCollapsibleSection>

          <UiCollapsibleSection :title="t('dashboard.profile.sections.recentWork')">
            <p class="mb-4 text-xs text-black/50 dark:text-white/50">
              {{ t('dashboard.profile.recentWorkHint') }}
            </p>
            <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div
                v-for="(photo, index) in recentWorkPhotos"
                :key="photo.id"
                class="group relative aspect-[4/3] overflow-hidden rounded-xl"
              >
                <NuxtImg
                  :src="photo.url"
                  :alt="t('dashboard.profile.sections.recentWork')"
                  class="h-full w-full object-cover"
                />
                <button
                  type="button"
                  class="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  :aria-label="t('dashboard.profile.removePhoto')"
                  @click="removeRecentWork(index)"
                >
                  <UiIcon
                    name="x"
                    :size="13"
                  />
                </button>
              </div>
              <button
                v-if="recentWorkPhotos.length < 6"
                type="button"
                class="flex aspect-[4/3] flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-black/20 text-black/40 transition-colors hover:border-brand-500 hover:text-brand-600 dark:border-white/20 dark:text-white/40"
                @click="recentWorkInput?.click()"
              >
                <UiIcon
                  name="plus"
                  :size="18"
                />
                <span class="text-xs font-semibold">{{ t('dashboard.profile.addPhoto') }}</span>
              </button>
            </div>
            <input
              ref="recentWorkInput"
              type="file"
              accept="image/*"
              class="hidden"
              :aria-label="t('dashboard.profile.addPhoto')"
              @change="onRecentWorkChange"
            >
          </UiCollapsibleSection>

          <div class="flex items-center justify-end gap-2.5">
            <span
              v-if="justSaved"
              class="mr-auto flex items-center gap-1.5 text-xs font-semibold text-brand-700 dark:text-brand-100"
            >
              <UiIcon
                name="check"
                :size="14"
              />{{ t('dashboard.profile.saved') }}
            </span>
            <UiButton
              variant="ghost"
              @click="syncFormFromProfile"
            >
              {{ t('dashboard.profile.cancel') }}
            </UiButton>
            <UiButton
              variant="primary"
              :disabled="isSaving"
              @click="handleSave"
            >
              {{ t('dashboard.profile.save') }}
            </UiButton>
          </div>
        </div>
      </div>
    </template>

    <DashboardKycStepper
      v-else-if="activeTab === 'kyc' && summary"
      :kyc="summary.kyc"
      @submitted="onKycSubmitted"
    />
  </div>
</template>
