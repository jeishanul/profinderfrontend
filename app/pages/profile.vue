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

const { data: profile, refresh: refreshProfile } = await useApi<ProviderProfileDetail>('/dashboard/profile', {
  key: 'dashboard-profile',
})
const { data: summary, refresh: refreshSummary } = await useApi<DashboardSummary>('/dashboard/summary', {
  key: 'dashboard-summary-provider',
  query: { role: 'provider' },
})
const { data: categories } = await useApi<ServiceCategory[]>('/categories', {
  key: 'categories',
  default: () => [],
})

// The active tab lives in the URL (`?tab=kyc`), not local state, so the
// sidebar's "Verification" link can both open this tab directly and know
// when to highlight itself instead of "My profile" — see `layouts/dashboard.vue`.
const route = useRoute()
const router = useRouter()

const activeTab = computed<'details' | 'kyc'>(() => (route.query.tab === 'kyc' ? 'kyc' : 'details'))

function setTab(tab: 'details' | 'kyc') {
  const query = { ...route.query }
  if (tab === 'kyc') query.tab = 'kyc'
  else delete query.tab
  router.replace({ query })
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
  minVisitFeeUsd: 0,
})

const photoUrl = ref<string | null>(null)
const coverPhotoUrl = ref<string | null>(null)
const skillIds = ref<string[]>([])
const recentWorkPhotos = ref<RecentWorkPhoto[]>([])

function syncFormFromProfile() {
  if (!profile.value) return
  form.fullName = profile.value.fullName
  form.headline = profile.value.headline
  form.bio = profile.value.bio
  form.phone = profile.value.phone
  form.email = profile.value.email
  form.provinceCode = profile.value.provinceCode
  form.cityCode = profile.value.cityCode
  form.barangay = profile.value.barangay
  form.address = profile.value.address
  form.categoryId = profile.value.categoryId
  form.yearsExperience = profile.value.yearsExperience
  form.hourlyRateUsd = profile.value.hourlyRateUsd
  form.minVisitFeeUsd = profile.value.minVisitFeeUsd
  photoUrl.value = profile.value.photoUrl
  coverPhotoUrl.value = profile.value.coverPhotoUrl
  skillIds.value = [...profile.value.skillIds]
  recentWorkPhotos.value = [...profile.value.recentWorkPhotos]
}

watch(profile, syncFormFromProfile, { immediate: true })

const categoryOptions = computed(() =>
  (categories.value ?? []).map(category => ({ value: category.id, label: t(`marketplace.categories.${category.id}.label`) })),
)

const ALL_SKILL_IDS = [
  'wiring', 'fault-fixing', 'panel-upgrades', 'deep-clean', 'move-out-clean', 'leak-repair',
  'fittings', 'interior-painting', 'texture-finish', 'furniture-repair', 'custom-fittings',
  'ac-servicing', 'ac-installation', 'fridge-repair', 'washer-repair', 'landscaping', 'garden-upkeep',
] as const

const skillOptions = computed(() =>
  ALL_SKILL_IDS
    .filter(id => !skillIds.value.includes(id))
    .map(id => ({ value: id, label: t(`marketplace.skills.${id}`) })),
)

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
const availableDays = ref<string[]>([])
watch(profile, (value) => {
  if (value) availableDays.value = [...value.availableDays]
}, { immediate: true })

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

async function onAvatarChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  const input = event.target as HTMLInputElement
  if (!file) return
  const body = new FormData()
  body.append('file', file)
  const result = await useApiFetch<{ url: string }>('/api/dashboard/profile/avatar', { method: 'POST', body })
  photoUrl.value = result.url
  input.value = ''
}

async function onCoverChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  const input = event.target as HTMLInputElement
  if (!file) return
  const body = new FormData()
  body.append('file', file)
  const result = await useApiFetch<{ url: string }>('/api/dashboard/profile/cover', { method: 'POST', body })
  coverPhotoUrl.value = result.url
  input.value = ''
}

async function onRecentWorkChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || recentWorkPhotos.value.length >= 6) return
  const body = new FormData()
  body.append('file', file)
  const result = await useApiFetch<{ id: string, url: string }>('/api/dashboard/profile/work-photos', { method: 'POST', body })
  recentWorkPhotos.value = [...recentWorkPhotos.value, { id: String(result.id), url: result.url }]
}

async function removeRecentWork(index: number) {
  const photo = recentWorkPhotos.value[index]
  if (!photo) return
  await useApiFetch(`/api/dashboard/profile/work-photos/${photo.id}`, { method: 'DELETE' })
  recentWorkPhotos.value = recentWorkPhotos.value.filter((_, i) => i !== index)
}

const memberSinceLabel = computed(() => {
  if (!profile.value) return ''
  return new Intl.DateTimeFormat(locale.value, { month: 'long', year: 'numeric' }).format(new Date(profile.value.memberSince))
})

const justSaved = ref(false)
async function handleSave() {
  await useApiFetch('/api/dashboard/profile', {
    method: 'PUT',
    body: {
      fullName: form.fullName,
      headline: form.headline,
      bio: form.bio,
      phone: form.phone,
      categoryId: form.categoryId,
      skillIds: skillIds.value,
      yearsExperience: form.yearsExperience,
      hourlyRateUsd: form.hourlyRateUsd,
      minVisitFeeUsd: form.minVisitFeeUsd,
      availableDays: availableDays.value,
      provinceCode: form.provinceCode,
      cityCode: form.cityCode,
      barangay: form.barangay,
      address: form.address,
    },
  })
  await refreshProfile()
  justSaved.value = true
  setTimeout(() => (justSaved.value = false), 2500)
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
    </div>

    <template v-if="activeTab === 'details' && profile">
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
          <img
            v-if="photoUrl"
            :src="photoUrl"
            :alt="form.fullName"
            class="h-24 w-24 rounded-full object-cover"
          >
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
                >{{ t('dashboard.profile.fields.address') }} <span
                  class="text-red-600 dark:text-red-400"
                  aria-hidden="true"
                >*</span></label>
                <UiInput
                  id="profile-address"
                  v-model="form.address"
                  icon="map-pin"
                  required
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
                {{ t(`marketplace.skills.${skillId}`) }}
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
                :placeholder="t('dashboard.profile.addSkillPlaceholder')"
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
                  :model-value="`$${form.hourlyRateUsd}`"
                  @update:model-value="(v) => (form.hourlyRateUsd = Number(v.replace(/\D/g, '')) || 0)"
                />
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
                  :model-value="`$${form.minVisitFeeUsd}`"
                  @update:model-value="(v) => (form.minVisitFeeUsd = Number(v.replace(/\D/g, '')) || 0)"
                />
              </div>
              <div>
                <label
                  for="profile-response-time"
                  class="mb-2 block text-xs font-bold"
                >{{ t('dashboard.profile.fields.responseTime') }}</label>
                <UiInput
                  id="profile-response-time"
                  :model-value="`${profile.responseTimeHours}h`"
                  disabled
                  class="opacity-60"
                />
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
                <img
                  :src="photo.url"
                  :alt="t('dashboard.profile.sections.recentWork')"
                  class="h-full w-full object-cover"
                >
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
      @submitted="refreshSummary"
    />
  </div>
</template>
