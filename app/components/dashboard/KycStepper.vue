<script setup lang="ts">
import type { KycState, KycStep, KycStepId, KycStepStatus } from '#shared/types/dashboard'

// Auto-imported as <DashboardKycStepper/>. The full 3-step identity
// verification flow on the profile page — mandatory before a provider can
// accept bookings (see CLAUDE.md brief and `pages/profile.vue`). Each step
// uploads to `POST /dashboard/kyc/{step}` (see `KycController`); "identity"
// additionally sends the NID number and back-of-ID photo, both stored
// alongside the front photo for the admin reviewer to see.
const props = defineProps<{
  kyc: KycState
}>()

const emit = defineEmits<{
  submitted: []
}>()

const { t } = useI18n()
const { settings } = useSiteSettings()
const siteName = computed(() => settings.value.siteName ?? t('brand.name'))
const toast = useToast()
const { confirm } = useConfirm()

const STEP_ORDER: KycStepId[] = ['identity', 'selfie', 'address']

const orderedSteps = computed(() =>
  STEP_ORDER
    .map(id => props.kyc.steps.find(step => step.id === id))
    .filter(step => step !== undefined),
)

function bodyFor(step: KycStep) {
  if (step.status === 'verified') return t(`dashboard.profile.kyc.steps.${step.id}.verifiedBody`)
  if (step.status === 'in_review') return t(`dashboard.profile.kyc.steps.${step.id}.inReviewBody`)
  if (step.status === 'rejected') {
    return step.rejectionReason
      ? t('dashboard.profile.kyc.rejectedBody', { reason: step.rejectionReason })
      : t('dashboard.profile.kyc.rejectedNoReason')
  }
  return t(`dashboard.profile.kyc.steps.${step.id}.pendingBody`)
}

const STATUS_LABEL_KEY: Record<KycStepStatus, string> = {
  verified: 'statusVerified',
  in_review: 'statusInReview',
  not_started: 'statusNotStarted',
  rejected: 'statusRejected',
}

const statusLabel = (status: KycStepStatus) => t(`dashboard.profile.kyc.${STATUS_LABEL_KEY[status]}`)

/** A verified step normally hides its upload form — `requestReplace` opens it back up behind a confirm, since replacing it drops the verified badge until it's re-approved. */
const replacingSteps = ref(new Set<KycStepId>())

/** A step takes an upload until it's in review or approved — a rejected one must be resubmittable. */
const canUpload = (step: KycStep) => step.status === 'not_started' || step.status === 'rejected' || replacingSteps.value.has(step.id)

async function requestReplace(stepId: KycStepId) {
  const confirmed = await confirm({
    title: t('dashboard.profile.kyc.replaceConfirm.title'),
    message: t('dashboard.profile.kyc.replaceConfirm.message'),
    confirmLabel: t('dashboard.profile.kyc.replaceConfirm.confirmLabel'),
    tone: 'danger',
  })
  if (!confirmed) return
  replacingSteps.value = new Set([...replacingSteps.value, stepId])
}

const STATUS_VARIANT: Record<KycStepStatus, 'primary' | 'accent' | 'neutral' | 'danger'> = {
  verified: 'primary',
  in_review: 'accent',
  not_started: 'neutral',
  rejected: 'danger',
}

const STEP_CIRCLE_CLASS: Record<KycStepStatus, string> = {
  verified: 'bg-brand-50 text-brand-700 dark:bg-brand-700/20 dark:text-brand-100',
  in_review: 'bg-accent-50 text-accent-700 dark:bg-accent-700/20 dark:text-accent-100',
  not_started: 'bg-black/5 text-black/40 dark:bg-white/10 dark:text-white/40',
  rejected: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
}

// --- File picking, one slot per upload — `previewUrl` is a local blob: URL
// for display only; `submitStep` below uploads the real `file` on submit. ---

interface PickedFile {
  file: File
  previewUrl: string
}

const nidNumber = ref('')
const nidFront = ref<PickedFile | null>(null)
const nidBack = ref<PickedFile | null>(null)
const selfiePhoto = ref<PickedFile | null>(null)
const addressDocument = ref<PickedFile | null>(null)

const nidFrontInput = useTemplateRef('nidFrontInput')
const nidBackInput = useTemplateRef('nidBackInput')
const selfieInput = useTemplateRef('selfieInput')
const addressInput = useTemplateRef('addressInput')

function pick(file: File): PickedFile {
  return { file, previewUrl: URL.createObjectURL(file) }
}

// Same limits the server enforces, checked before a slow upload that would be refused.
const MAX_BYTES = 8 * 1024 * 1024
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

function fileFrom(event: Event, allowPdf = false): File | null {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  input.value = ''
  if (!file) return null
  if (!IMAGE_TYPES.includes(file.type) && !(allowPdf && file.type === 'application/pdf')) {
    toast.error(t(allowPdf ? 'dashboard.profile.kyc.errors.typeWithPdf' : 'dashboard.profile.kyc.errors.type'))
    return null
  }
  if (file.size > MAX_BYTES) {
    toast.error(t('dashboard.profile.kyc.errors.tooLarge'))
    return null
  }
  return file
}

// Named per slot (rather than one generic handler taking a target ref) since
// template refs inside `v-for` — even a guarded one that only ever renders
// once — type as arrays, and a template expression can't pass an unwrapped
// `ref.value` back out as a writable ref anyway.
function onNidFrontChange(event: Event) {
  const file = fileFrom(event)
  if (file) nidFront.value = pick(file)
}
function onNidBackChange(event: Event) {
  const file = fileFrom(event)
  if (file) nidBack.value = pick(file)
}
function onSelfieChange(event: Event) {
  const file = fileFrom(event)
  if (file) selfiePhoto.value = pick(file)
}
function onAddressChange(event: Event) {
  const file = fileFrom(event, true)
  if (file) addressDocument.value = pick(file)
}

const canSubmitIdentity = computed(() => nidNumber.value.trim().length > 0 && !!nidFront.value && !!nidBack.value)
const canSubmitSelfie = computed(() => !!selfiePhoto.value)
const canSubmitAddress = computed(() => !!addressDocument.value)

const STEP_FILE: Record<KycStepId, () => PickedFile | null> = {
  identity: () => nidFront.value,
  selfie: () => selfiePhoto.value,
  address: () => addressDocument.value,
}

const isSubmitting = ref(false)

/** After a successful upload, forget the picked files so a later resubmit starts clean. */
function resetStep(stepId: KycStepId) {
  if (stepId === 'identity') {
    nidNumber.value = ''
    nidFront.value = null
    nidBack.value = null
  }
  else if (stepId === 'selfie') {
    selfiePhoto.value = null
  }
  else {
    addressDocument.value = null
  }
}

async function submitStep(stepId: KycStepId) {
  const picked = STEP_FILE[stepId]()
  if (!picked) return
  isSubmitting.value = true
  try {
    const body = new FormData()
    body.append('file', picked.file)
    if (stepId === 'identity') {
      body.append('nidNumber', nidNumber.value)
      if (nidBack.value) body.append('back', nidBack.value.file)
    }
    if (replacingSteps.value.has(stepId)) body.append('confirm', '1')
    await useApiFetch(`/api/dashboard/kyc/${stepId}`, { method: 'POST', body })
    toast.success(t('dashboard.profile.kyc.submitted'))
    resetStep(stepId)
    const next = new Set(replacingSteps.value)
    next.delete(stepId)
    replacingSteps.value = next
    emit('submitted')
  }
  catch (error) {
    toast.error(Object.values(apiFieldErrors(error))[0] ?? apiErrorMessage(error, t('dashboard.profile.kyc.errors.submit')))
  }
  finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <div
      v-if="!kyc.isVerified"
      class="flex items-center gap-4 rounded-2xl border border-red-600/30 bg-red-50 p-5 dark:bg-red-900/10"
    >
      <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
        <UiIcon
          name="alert-triangle"
          :size="21"
        />
      </span>
      <div>
        <div class="text-[15px] font-bold">
          {{ t('dashboard.profile.kyc.mandatoryTitle') }}
        </div>
        <div class="mt-0.5 text-[13px] text-black/60 dark:text-white/60">
          {{ t('dashboard.profile.kyc.mandatoryBody', { site: siteName }) }}
        </div>
      </div>
    </div>

    <div class="rounded-2xl border border-black/10 p-6 dark:border-white/10">
      <div
        v-for="(step, index) in orderedSteps"
        :key="step.id"
        class="flex gap-4 py-4"
        :class="index < orderedSteps.length - 1 && 'border-b border-black/10 dark:border-white/10'"
      >
        <span
          class="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full text-[13px] font-bold"
          :class="STEP_CIRCLE_CLASS[step.status]"
        >
          <UiIcon
            v-if="step.status === 'verified'"
            name="check"
            :size="15"
          />
          <template v-else>
            {{ index + 1 }}
          </template>
        </span>
        <div class="flex-1">
          <div class="flex items-center justify-between gap-3">
            <div class="text-[14.5px] font-bold">
              {{ index + 1 }}. {{ t(`dashboard.profile.kyc.steps.${step.id}.title`) }}
            </div>
            <UiTag :variant="STATUS_VARIANT[step.status]">
              {{ statusLabel(step.status) }}
            </UiTag>
          </div>
          <p
            class="mt-1 text-[13px]"
            :class="step.status === 'rejected' ? 'font-semibold text-red-700 dark:text-red-300' : 'text-black/60 dark:text-white/60'"
          >
            {{ bodyFor(step) }}
          </p>

          <UiButton
            v-if="step.status === 'verified' && !canUpload(step)"
            variant="ghost"
            class="mt-2 px-3 py-1.5 text-xs"
            @click="requestReplace(step.id)"
          >
            {{ t('dashboard.profile.kyc.replaceDocument') }}
          </UiButton>

          <!-- Identity: NID number + front/back photo uploads -->
          <div
            v-if="canUpload(step) && step.id === 'identity'"
            class="mt-3 flex flex-col gap-3"
          >
            <div>
              <label
                for="kyc-nid-number"
                class="mb-1.5 block text-xs font-bold"
              >{{ t('dashboard.profile.kyc.nidNumberLabel') }}</label>
              <UiInput
                id="kyc-nid-number"
                v-model="nidNumber"
                :placeholder="t('dashboard.profile.kyc.nidNumberPlaceholder')"
              />
            </div>
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div
                class="flex flex-col items-center gap-2 rounded-xl border border-dashed border-black/20 p-4 text-black/40 dark:border-white/20 dark:text-white/40"
                :class="nidFront && 'border-solid border-brand-500 text-black dark:text-white'"
              >
                <img
                  v-if="nidFront"
                  :src="nidFront.previewUrl"
                  :alt="t('dashboard.profile.kyc.nidFront')"
                  class="h-16 w-full rounded-lg object-cover"
                >
                <UiIcon
                  v-else
                  name="upload-cloud"
                  :size="22"
                />
                <div class="text-[12.5px]">
                  {{ t('dashboard.profile.kyc.nidFront') }}
                </div>
                <UiButton
                  variant="secondary"
                  class="px-3 py-1.5 text-xs"
                  @click="nidFrontInput?.click()"
                >
                  {{ nidFront ? t('dashboard.profile.kyc.replace') : t('dashboard.profile.kyc.browseFiles') }}
                </UiButton>
              </div>
              <div
                class="flex flex-col items-center gap-2 rounded-xl border border-dashed border-black/20 p-4 text-black/40 dark:border-white/20 dark:text-white/40"
                :class="nidBack && 'border-solid border-brand-500 text-black dark:text-white'"
              >
                <img
                  v-if="nidBack"
                  :src="nidBack.previewUrl"
                  :alt="t('dashboard.profile.kyc.nidBack')"
                  class="h-16 w-full rounded-lg object-cover"
                >
                <UiIcon
                  v-else
                  name="upload-cloud"
                  :size="22"
                />
                <div class="text-[12.5px]">
                  {{ t('dashboard.profile.kyc.nidBack') }}
                </div>
                <UiButton
                  variant="secondary"
                  class="px-3 py-1.5 text-xs"
                  @click="nidBackInput?.click()"
                >
                  {{ nidBack ? t('dashboard.profile.kyc.replace') : t('dashboard.profile.kyc.browseFiles') }}
                </UiButton>
              </div>
            </div>
            <UiButton
              variant="primary"
              class="self-start"
              :disabled="!canSubmitIdentity || isSubmitting"
              @click="submitStep('identity')"
            >
              {{ t('dashboard.profile.kyc.submitStep') }}
            </UiButton>
          </div>

          <!-- Selfie / address: a single photo or document upload -->
          <div
            v-else-if="canUpload(step)"
            class="mt-3 flex flex-col items-center gap-2 rounded-xl border border-dashed border-black/20 p-6 text-black/40 dark:border-white/20 dark:text-white/40"
            :class="(step.id === 'selfie' ? selfiePhoto : addressDocument) && 'border-solid border-brand-500 text-black dark:text-white'"
          >
            <img
              v-if="step.id === 'selfie' && selfiePhoto"
              :src="selfiePhoto.previewUrl"
              :alt="t('dashboard.profile.kyc.selfieUpload')"
              class="h-24 w-24 rounded-full object-cover"
            >
            <img
              v-else-if="step.id === 'address' && addressDocument"
              :src="addressDocument.previewUrl"
              :alt="t('dashboard.profile.kyc.addressUpload')"
              class="h-20 w-full max-w-xs rounded-lg object-cover"
            >
            <UiIcon
              v-else
              name="upload-cloud"
              :size="26"
            />
            <div class="text-[13px]">
              {{ t('dashboard.profile.kyc.dropzone') }}
            </div>
            <UiButton
              variant="secondary"
              class="px-4 py-2 text-xs"
              @click="step.id === 'selfie' ? selfieInput?.click() : addressInput?.click()"
            >
              {{ (step.id === 'selfie' ? selfiePhoto : addressDocument)
                ? t('dashboard.profile.kyc.replace')
                : t('dashboard.profile.kyc.browseFiles') }}
            </UiButton>
            <UiButton
              variant="primary"
              class="mt-1"
              :disabled="(step.id === 'selfie' ? !canSubmitSelfie : !canSubmitAddress) || isSubmitting"
              @click="submitStep(step.id)"
            >
              {{ t('dashboard.profile.kyc.submitStep') }}
            </UiButton>
          </div>
        </div>
      </div>
    </div>

    <!-- Hidden file inputs, kept outside the `v-for` above (a template ref
         inside `v-for` types/binds as an array even when it only ever
         renders once, since each step id shows its own guarded block). -->
    <input
      ref="nidFrontInput"
      type="file"
      accept="image/jpeg,image/png,image/webp"
      class="hidden"
      :aria-label="t('dashboard.profile.kyc.nidFront')"
      @change="onNidFrontChange"
    >
    <input
      ref="nidBackInput"
      type="file"
      accept="image/jpeg,image/png,image/webp"
      class="hidden"
      :aria-label="t('dashboard.profile.kyc.nidBack')"
      @change="onNidBackChange"
    >
    <input
      ref="selfieInput"
      type="file"
      accept="image/jpeg,image/png,image/webp"
      class="hidden"
      :aria-label="t('dashboard.profile.kyc.selfieUpload')"
      @change="onSelfieChange"
    >
    <input
      ref="addressInput"
      type="file"
      accept="image/jpeg,image/png,image/webp,application/pdf"
      class="hidden"
      :aria-label="t('dashboard.profile.kyc.addressUpload')"
      @change="onAddressChange"
    >

    <div class="flex items-center gap-2.5 text-xs text-black/40 dark:text-white/40">
      <UiIcon
        name="info"
        :size="15"
      />
      {{ t('dashboard.profile.kyc.complianceNote') }}
    </div>
  </div>
</template>
