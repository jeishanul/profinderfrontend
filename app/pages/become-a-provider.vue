<script setup lang="ts">
import type { ProviderProfileDetail } from '#shared/types/dashboard'
import type { ServiceCategory } from '#shared/types/marketplace'

// The explicit, opt-in way to become a provider. Opening the profile editor
// used to do this silently (and list an empty profile publicly); now the
// profile only exists once this form is submitted with the minimum a client
// needs to see: category, headline, rate and location.
definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
  hideBottomNav: true,
})

const { t } = useI18n()
const { symbol } = useSiteSettings()
const localePath = useLocalePath()
const session = useSession()
const toast = useToast()

if (session.user.value?.isProvider) {
  await navigateTo(localePath('/profile'), { replace: true })
}

const { data: categories } = await useApi<ServiceCategory[]>('/categories', {
  key: 'categories-with-skills',
  query: { include: 'skills' },
  default: () => [],
})

const STEP_IDS = ['service', 'about', 'location'] as const
const stepIndex = ref(0)
const isLastStep = computed(() => stepIndex.value === STEP_IDS.length - 1)

const form = reactive({
  categoryId: null as string | null,
  skillIds: [] as string[],
  headline: '',
  bio: '',
  yearsExperience: 0,
  hourlyRateUsd: 0,
  provinceCode: null as string | null,
  cityCode: null as string | null,
  barangay: null as string | null,
})

const categoryOptions = computed(() => (categories.value ?? []).map(category => ({ value: category.id, label: category.name })))
const categorySkills = computed(() => (categories.value ?? []).find(category => category.id === form.categoryId)?.skills ?? [])

watch(() => form.categoryId, () => {
  form.skillIds = []
})

function toggleSkill(id: string) {
  form.skillIds = form.skillIds.includes(id)
    ? form.skillIds.filter(skillId => skillId !== id)
    : [...form.skillIds, id]
}

const stepError = ref<string | null>(null)

function validateStep(index: number): string | null {
  if (index === 0 && !form.categoryId) return t('dashboard.becomeProvider.errors.category')
  if (index === 1) {
    if (!form.headline.trim()) return t('dashboard.becomeProvider.errors.headline')
    if (form.hourlyRateUsd <= 0) return t('dashboard.becomeProvider.errors.rate')
  }
  if (index === 2 && (!form.provinceCode || !form.cityCode)) return t('dashboard.becomeProvider.errors.location')
  return null
}

function next() {
  stepError.value = validateStep(stepIndex.value)
  if (!stepError.value) stepIndex.value += 1
}

function back() {
  stepError.value = null
  stepIndex.value = Math.max(0, stepIndex.value - 1)
}

const isSubmitting = ref(false)
const needsEmailVerification = ref(false)
const verification = useEmailVerification()

async function submit() {
  stepError.value = validateStep(stepIndex.value)
  if (stepError.value) return

  isSubmitting.value = true
  try {
    await useApiFetch<ProviderProfileDetail>('/api/dashboard/provider-profile', {
      method: 'POST',
      body: {
        categoryId: form.categoryId,
        skillIds: form.skillIds,
        headline: form.headline.trim(),
        bio: form.bio.trim() || null,
        yearsExperience: form.yearsExperience,
        hourlyRateUsd: form.hourlyRateUsd,
        provinceCode: form.provinceCode,
        cityCode: form.cityCode,
        barangay: form.barangay,
      },
    })
    // `isProvider` comes from the session user — refresh it so the nav, role
    // switch and every provider-only page see the new profile immediately.
    await session.fetchUser()
    session.setActiveRole('provider')
    toast.success(t('dashboard.becomeProvider.success'))
    await navigateTo(localePath({ path: '/profile', query: { tab: 'kyc' } }))
  }
  catch (error) {
    needsEmailVerification.value = isEmailUnverifiedError(error)
    const firstFieldError = Object.values(apiFieldErrors(error))[0]
    stepError.value = firstFieldError ?? apiErrorMessage(error, t('dashboard.becomeProvider.errors.submit'))
  }
  finally {
    isSubmitting.value = false
  }
}

function parseMoney(value: string): number {
  const amount = Number.parseFloat(value.replace(/[^\d.]/g, ''))
  return Number.isFinite(amount) ? amount : 0
}

useSeoMeta({
  title: t('dashboard.becomeProvider.title'),
})
</script>

<template>
  <div class="mx-auto flex w-full max-w-2xl flex-col gap-6">
    <UiBackButton fallback="/" />

    <div>
      <h1 class="font-display text-2xl font-bold">
        {{ t('dashboard.becomeProvider.title') }}
      </h1>
      <p class="mt-0.5 text-sm text-black/60 dark:text-white/60">
        {{ t('dashboard.becomeProvider.subtitle') }}
      </p>
    </div>

    <ol class="flex gap-2">
      <li
        v-for="(id, index) in STEP_IDS"
        :key="id"
        class="flex-1"
      >
        <div
          class="h-1.5 rounded-full transition-colors"
          :class="index <= stepIndex ? 'bg-brand-600' : 'bg-black/10 dark:bg-white/10'"
        />
        <span
          class="mt-1.5 block text-xs font-bold"
          :class="index === stepIndex ? 'text-black dark:text-white' : 'text-black/40 dark:text-white/40'"
        >{{ t(`dashboard.becomeProvider.steps.${id}`) }}</span>
      </li>
    </ol>

    <form
      class="flex flex-col gap-5 rounded-2xl border border-black/10 p-5 sm:p-6 dark:border-white/10"
      @submit.prevent="isLastStep ? submit() : next()"
    >
      <template v-if="stepIndex === 0">
        <div>
          <label
            for="bp-category"
            class="mb-2 block text-xs font-bold"
          >{{ t('dashboard.becomeProvider.fields.category') }}</label>
          <UiSelectSearch
            id="bp-category"
            v-model="form.categoryId"
            :options="categoryOptions"
            :placeholder="t('dashboard.becomeProvider.fields.categoryPlaceholder')"
          />
        </div>
        <div v-if="form.categoryId">
          <span class="mb-1 block text-xs font-bold">{{ t('dashboard.becomeProvider.fields.skills') }}</span>
          <p class="mb-2.5 text-xs text-black/50 dark:text-white/50">
            {{ t('dashboard.becomeProvider.fields.skillsHint') }}
          </p>
          <div
            v-if="categorySkills.length > 0"
            class="flex flex-wrap gap-2"
          >
            <button
              v-for="skill in categorySkills"
              :key="skill.id"
              type="button"
              class="rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors"
              :class="form.skillIds.includes(skill.id)
                ? 'bg-brand-50 text-brand-700 dark:bg-brand-700/20 dark:text-brand-100'
                : 'bg-black/5 text-black/50 dark:bg-white/10 dark:text-white/50'"
              :aria-pressed="form.skillIds.includes(skill.id)"
              @click="toggleSkill(skill.id)"
            >
              {{ skill.name }}
            </button>
          </div>
          <p
            v-else
            class="text-xs text-black/50 dark:text-white/50"
          >
            {{ t('dashboard.becomeProvider.fields.noSkills') }}
          </p>
        </div>
      </template>

      <template v-else-if="stepIndex === 1">
        <div>
          <label
            for="bp-headline"
            class="mb-2 block text-xs font-bold"
          >{{ t('dashboard.becomeProvider.fields.headline') }}</label>
          <UiInput
            id="bp-headline"
            v-model="form.headline"
            maxlength="120"
            :placeholder="t('dashboard.becomeProvider.fields.headlinePlaceholder')"
          />
        </div>
        <div>
          <label
            for="bp-bio"
            class="mb-2 block text-xs font-bold"
          >{{ t('dashboard.becomeProvider.fields.bio') }}</label>
          <textarea
            id="bp-bio"
            v-model="form.bio"
            rows="4"
            maxlength="2000"
            :placeholder="t('dashboard.becomeProvider.fields.bioPlaceholder')"
            class="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
        </div>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              for="bp-years"
              class="mb-2 block text-xs font-bold"
            >{{ t('dashboard.becomeProvider.fields.years') }}</label>
            <UiInput
              id="bp-years"
              :model-value="String(form.yearsExperience)"
              inputmode="numeric"
              @update:model-value="(v) => (form.yearsExperience = Math.min(60, Number(v.replace(/\D/g, '')) || 0))"
            />
          </div>
          <div>
            <label
              for="bp-rate"
              class="mb-2 block text-xs font-bold"
            >{{ t('dashboard.becomeProvider.fields.rate') }}</label>
            <UiInput
              id="bp-rate"
              :model-value="form.hourlyRateUsd ? `${symbol}${form.hourlyRateUsd}` : ''"
              inputmode="decimal"
              :placeholder="symbol"
              @update:model-value="(v) => (form.hourlyRateUsd = parseMoney(v))"
            />
            <p class="mt-1.5 text-xs text-black/50 dark:text-white/50">
              {{ t('dashboard.becomeProvider.fields.rateHelp') }}
            </p>
          </div>
        </div>
      </template>

      <div
        v-else
        class="grid grid-cols-1 gap-4 sm:grid-cols-2"
      >
        <UiLocationPicker
          id="bp-location"
          v-model:province="form.provinceCode"
          v-model:city="form.cityCode"
          v-model:barangay="form.barangay"
          variant="form"
        />
      </div>

      <p
        v-if="stepError"
        role="alert"
        class="text-sm font-semibold text-red-600 dark:text-red-400"
      >
        {{ stepError }}
      </p>
      <UiButton
        v-if="needsEmailVerification"
        type="button"
        variant="secondary"
        class="self-start"
        :disabled="verification.isStarting.value"
        @click="verification.start(() => submit())"
      >
        {{ t('dashboard.becomeProvider.verifyEmail') }}
      </UiButton>

      <div class="flex items-center justify-between gap-3">
        <UiButton
          v-if="stepIndex > 0"
          variant="ghost"
          @click="back"
        >
          {{ t('dashboard.becomeProvider.back') }}
        </UiButton>
        <span
          v-else
          class="text-xs text-black/40 dark:text-white/40"
        >{{ t('dashboard.becomeProvider.step', { current: stepIndex + 1, total: STEP_IDS.length }) }}</span>
        <UiButton
          type="submit"
          variant="primary"
          :disabled="isSubmitting"
        >
          {{ isLastStep ? t('dashboard.becomeProvider.submit') : t('dashboard.becomeProvider.next') }}
        </UiButton>
      </div>
    </form>
  </div>
</template>
