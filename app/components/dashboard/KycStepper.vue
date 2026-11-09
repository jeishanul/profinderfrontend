<script setup lang="ts">
import type { RequirementStatus, VerificationRequirement } from '#shared/types/billing'
import type { KycDetail } from '#shared/types/dashboard'
import type { KycSection } from '~/utils/billing'

// Auto-imported as <DashboardKycStepper/>. The Verification tab on the profile page, driven by the verification
// levels (`GET /dashboard/kyc` → `levels`): each paid level lists its requirements. Pay first, then upload — a level's
// requirements take uploads only while the provider holds it (`canUpload`); the others are shown read-only with a
// link to Billing. Each requirement uploads to `POST /dashboard/kyc/{key}`, with the input its `kind` asks for:
// an ID (front + back + number), a photo, a document (image or PDF), a phone number or a short text.
const props = defineProps<{
  kyc: KycDetail
}>()

const emit = defineEmits<{
  submitted: []
}>()

const { t } = useI18n()
const { settings } = useSiteSettings()
const siteName = computed(() => settings.value.siteName ?? t('brand.name'))
const toast = useToast()
const { confirm } = useConfirm()

const sections = computed(() => kycSections(props.kyc.levels))

const STATUS_LABEL_KEY: Record<RequirementStatus, string> = {
  verified: 'statusVerified',
  in_review: 'statusInReview',
  not_started: 'statusNotStarted',
  rejected: 'statusRejected',
}

const STATUS_VARIANT: Record<RequirementStatus, 'primary' | 'accent' | 'neutral' | 'danger'> = {
  verified: 'primary',
  in_review: 'accent',
  not_started: 'neutral',
  rejected: 'danger',
}

const STEP_CIRCLE_CLASS: Record<RequirementStatus, string> = {
  verified: 'bg-brand-50 text-brand-700 dark:bg-brand-700/20 dark:text-brand-100',
  in_review: 'bg-accent-50 text-accent-700 dark:bg-accent-700/20 dark:text-accent-100',
  not_started: 'bg-black/5 text-black/40 dark:bg-white/10 dark:text-white/40',
  rejected: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
}

const isTyped = (requirement: VerificationRequirement) => requirement.kind === 'phone' || requirement.kind === 'text'

function bodyFor(requirement: VerificationRequirement) {
  if (requirement.status === 'verified') return t('dashboard.profile.kyc.body.verified')
  if (requirement.status === 'in_review') {
    return requirement.kind === 'phone' && requirement.value
      ? t('dashboard.profile.kyc.body.phoneInReview', { value: requirement.value })
      : t('dashboard.profile.kyc.body.inReview')
  }
  if (requirement.status === 'rejected') {
    return requirement.rejectionReason
      ? t('dashboard.profile.kyc.rejectedBody', { reason: requirement.rejectionReason })
      : t('dashboard.profile.kyc.rejectedNoReason')
  }
  return requirement.description || t(`dashboard.profile.kyc.body.pending.${requirement.kind}`)
}

function sectionBadge(section: KycSection) {
  return badgeState(section.level)
}

/** A verified requirement normally hides its form — `requestReplace` opens it again behind a confirm, since replacing it drops the badge until it's re-approved. */
const replacing = ref(new Set<string>())

function canEdit(section: KycSection, requirement: VerificationRequirement) {
  if (!section.level.canUpload) return false
  return requirement.status === 'not_started' || requirement.status === 'rejected' || replacing.value.has(requirement.key)
}

async function requestReplace(key: string) {
  const confirmed = await confirm({
    title: t('dashboard.profile.kyc.replaceConfirm.title'),
    message: t('dashboard.profile.kyc.replaceConfirm.message'),
    confirmLabel: t('dashboard.profile.kyc.replaceConfirm.confirmLabel'),
    tone: 'danger',
  })
  if (!confirmed) return
  replacing.value = new Set([...replacing.value, key])
}

// --- What has been picked/typed so far, per requirement key. `previewUrl` is a local blob: URL for display only. ---

interface PickedFile {
  file: File
  previewUrl: string | null
}

interface Draft {
  front: PickedFile | null
  back: PickedFile | null
  nidNumber: string
  value: string
}

const drafts = reactive<Record<string, Draft>>({})
watch(sections, (list) => {
  for (const section of list) {
    for (const requirement of section.requirements) {
      drafts[requirement.key] ??= { front: null, back: null, nidNumber: '', value: '' }
    }
  }
}, { immediate: true })

function draftFor(key: string): Draft {
  return drafts[key] ?? { front: null, back: null, nidNumber: '', value: '' }
}

// One hidden file input serves every slot: `openPicker` says which requirement/slot the next file is for.
const fileInput = useTemplateRef('fileInput')
const pickTarget = shallowRef<{ key: string, slot: 'front' | 'back', allowPdf: boolean, label: string } | null>(null)
const fileAccept = computed(() => pickTarget.value?.allowPdf ? 'image/*,application/pdf' : 'image/*')
const fileLabel = computed(() => t('dashboard.profile.kyc.fileLabel', { label: pickTarget.value?.label ?? '' }))

function openPicker(requirement: VerificationRequirement, slot: 'front' | 'back') {
  pickTarget.value = { key: requirement.key, slot, allowPdf: requirement.kind === 'document', label: requirement.label }
  // The `accept` attribute must be current before the dialog opens.
  nextTick(() => fileInput.value?.click())
}

// Same limits the server enforces, checked before a slow upload that would be refused.
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/bmp', 'image/avif', 'image/heic', 'image/heif']

async function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const picked = input.files?.[0] ?? null
  input.value = ''
  const target = pickTarget.value
  if (!picked || !target) return
  if (!IMAGE_TYPES.includes(picked.type) && !(target.allowPdf && picked.type === 'application/pdf')) {
    toast.error(t(target.allowPdf ? 'dashboard.profile.kyc.errors.typeWithPdf' : 'dashboard.profile.kyc.errors.type'))
    return
  }
  // A photo of a document is shrunk before upload (HEIC becomes JPEG where the browser can read it). A PDF is sent as is.
  const file = picked.type === 'application/pdf' ? picked : await downscaleImage(picked)
  if (file.size > MAX_UPLOAD_IMAGE_BYTES) {
    toast.error(t('dashboard.profile.kyc.errors.tooLarge'))
    return
  }
  const draft = drafts[target.key]
  if (!draft) return
  const previous = draft[target.slot]?.previewUrl
  if (previous) URL.revokeObjectURL(previous)
  draft[target.slot] = { file, previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null }
}

function canSubmit(requirement: VerificationRequirement) {
  const draft = draftFor(requirement.key)
  switch (requirement.kind) {
    case 'id_document': return draft.nidNumber.trim() !== '' && !!draft.front && !!draft.back
    case 'phone': return isPlausiblePhone(draft.value)
    case 'text': return draft.value.trim() !== ''
    default: return !!draft.front
  }
}

function resetDraft(key: string) {
  const draft = drafts[key]
  if (!draft) return
  for (const slot of ['front', 'back'] as const) {
    const url = draft[slot]?.previewUrl
    if (url) URL.revokeObjectURL(url)
    draft[slot] = null
  }
  draft.nidNumber = ''
  draft.value = ''
}

onBeforeUnmount(() => {
  for (const key of Object.keys(drafts)) resetDraft(key)
})

const submittingKey = ref<string | null>(null)

async function submit(requirement: VerificationRequirement) {
  if (!canSubmit(requirement)) {
    if (requirement.kind === 'phone') toast.error(t('dashboard.profile.kyc.errors.phone'))
    return
  }
  const draft = draftFor(requirement.key)
  submittingKey.value = requirement.key
  try {
    const body = new FormData()
    if (isTyped(requirement)) {
      body.append('value', draft.value.trim())
    }
    else if (draft.front) {
      body.append('file', draft.front.file)
    }
    if (requirement.kind === 'id_document') {
      body.append('nidNumber', draft.nidNumber.trim())
      if (draft.back) body.append('back', draft.back.file)
    }
    if (replacing.value.has(requirement.key)) body.append('confirm', '1')
    await useApiFetch(`/api/dashboard/kyc/${encodeURIComponent(requirement.key)}`, { method: 'POST', body })
    toast.success(t('dashboard.profile.kyc.submitted'))
    resetDraft(requirement.key)
    const next = new Set(replacing.value)
    next.delete(requirement.key)
    replacing.value = next
    emit('submitted')
  }
  catch (error) {
    toast.error(Object.values(apiFieldErrors(error))[0] ?? apiErrorMessage(error, t('dashboard.profile.kyc.errors.submit')))
  }
  finally {
    submittingKey.value = null
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
      <div class="min-w-0 flex-1">
        <div class="text-[15px] font-bold">
          {{ t('dashboard.profile.kyc.mandatoryTitle') }}
        </div>
        <div class="mt-0.5 text-[13px] text-black/60 dark:text-white/60">
          {{ t('dashboard.profile.kyc.mandatoryBody', { site: siteName }) }}
        </div>
      </div>
      <NuxtLinkLocale
        to="/billing"
        :class="linkButtonClass('primary', 'sm')"
      >
        {{ t('dashboard.sidebar.billing') }}
      </NuxtLinkLocale>
    </div>

    <p class="flex items-start gap-2.5 text-[13px] text-black/60 dark:text-white/60">
      <UiIcon
        name="info"
        :size="15"
        class="mt-0.5 shrink-0"
      />
      {{ t('dashboard.profile.kyc.payFirst') }}
    </p>

    <p
      v-if="sections.length === 0"
      class="rounded-2xl border border-dashed border-black/15 p-6 text-center text-sm text-black/60 dark:border-white/15 dark:text-white/60"
    >
      {{ t('dashboard.profile.kyc.noLevels') }}
    </p>

    <section
      v-for="section in sections"
      :key="section.level.id"
      class="rounded-2xl border border-black/10 p-6 dark:border-white/10"
      :aria-labelledby="`kyc-level-${section.level.id}`"
    >
      <header class="flex flex-wrap items-start justify-between gap-3 border-b border-black/10 pb-4 dark:border-white/10">
        <div>
          <h2
            :id="`kyc-level-${section.level.id}`"
            class="font-display text-base font-bold"
          >
            {{ section.level.name }}
          </h2>
          <p
            v-if="section.level.badgeLabel"
            class="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-brand-700 dark:text-brand-100"
          >
            <UiIcon
              name="shield-check"
              filled
              :size="12"
            />{{ section.level.badgeLabel }}
          </p>
        </div>
        <UiTag
          v-if="sectionBadge(section) === 'onProfile'"
          variant="primary"
          size="sm"
        >
          {{ t('dashboard.profile.kyc.badgeOn') }}
        </UiTag>
        <UiTag
          v-else-if="sectionBadge(section) === 'waitingDocuments'"
          variant="accent"
          size="sm"
        >
          {{ t('dashboard.profile.kyc.badgeWaiting', requirementProgress(section.level.requirements)) }}
        </UiTag>
        <NuxtLinkLocale
          v-else-if="!section.level.canUpload"
          to="/billing"
          :class="linkButtonClass('secondary', 'sm')"
        >
          {{ section.level.subscription ? t('dashboard.profile.kyc.renewLevel') : t('dashboard.profile.kyc.getLevel') }}
        </NuxtLinkLocale>
      </header>

      <p
        v-if="!section.level.canUpload"
        class="mt-3 text-[13px] text-black/60 dark:text-white/60"
      >
        {{ section.level.subscription ? t('dashboard.profile.kyc.expired') : t('dashboard.profile.kyc.notHeld') }}
      </p>

      <div
        v-for="(requirement, index) in section.requirements"
        :key="requirement.key"
        class="flex gap-4 py-4"
        :class="index < section.requirements.length - 1 && 'border-b border-black/10 dark:border-white/10'"
      >
        <span
          class="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full text-[13px] font-bold"
          :class="STEP_CIRCLE_CLASS[requirement.status]"
        >
          <UiIcon
            v-if="requirement.status === 'verified'"
            name="check"
            :size="15"
          />
          <template v-else>
            {{ index + 1 }}
          </template>
        </span>
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <h3 class="text-[14.5px] font-bold">
              {{ requirement.label }}
            </h3>
            <UiTag :variant="STATUS_VARIANT[requirement.status]">
              {{ t(`dashboard.profile.kyc.${STATUS_LABEL_KEY[requirement.status]}`) }}
            </UiTag>
          </div>
          <p
            class="mt-1 text-[13px]"
            :class="requirement.status === 'rejected' ? 'font-semibold text-red-700 dark:text-red-300' : 'text-black/60 dark:text-white/60'"
          >
            {{ bodyFor(requirement) }}
          </p>
          <p
            v-if="requirement.value && requirement.kind === 'text' && requirement.status !== 'not_started'"
            class="mt-1 text-[13px] text-black/60 dark:text-white/60"
          >
            {{ t('dashboard.profile.kyc.submittedValue', { value: requirement.value }) }}
          </p>

          <UiButton
            v-if="section.level.canUpload && requirement.status === 'verified' && !canEdit(section, requirement)"
            variant="ghost"
            class="mt-2 px-3 py-1.5 text-xs"
            @click="requestReplace(requirement.key)"
          >
            {{ t('dashboard.profile.kyc.replaceDocument') }}
          </UiButton>

          <form
            v-if="canEdit(section, requirement)"
            class="mt-3 flex flex-col gap-3"
            @submit.prevent="submit(requirement)"
          >
            <!-- An ID: its number plus photos of both sides -->
            <template v-if="requirement.kind === 'id_document'">
              <div>
                <label
                  :for="`kyc-${requirement.key}-number`"
                  class="mb-1.5 block text-xs font-bold"
                >{{ t('dashboard.profile.kyc.nidNumberLabel') }}</label>
                <UiInput
                  :id="`kyc-${requirement.key}-number`"
                  v-model="draftFor(requirement.key).nidNumber"
                  :placeholder="t('dashboard.profile.kyc.nidNumberPlaceholder')"
                />
              </div>
              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div
                  v-for="slot in (['front', 'back'] as const)"
                  :key="slot"
                  class="flex flex-col items-center gap-2 rounded-xl border border-dashed border-black/20 p-4 text-black/40 dark:border-white/20 dark:text-white/40"
                  :class="draftFor(requirement.key)[slot] && 'border-solid border-brand-500 text-black dark:text-white'"
                >
                  <img
                    v-if="draftFor(requirement.key)[slot]?.previewUrl"
                    :src="draftFor(requirement.key)[slot]?.previewUrl ?? undefined"
                    :alt="t(slot === 'front' ? 'dashboard.profile.kyc.nidFront' : 'dashboard.profile.kyc.nidBack')"
                    class="h-16 w-full rounded-lg object-cover"
                  >
                  <UiIcon
                    v-else
                    name="upload-cloud"
                    :size="22"
                  />
                  <div class="text-[12.5px]">
                    {{ t(slot === 'front' ? 'dashboard.profile.kyc.nidFront' : 'dashboard.profile.kyc.nidBack') }}
                  </div>
                  <UiButton
                    variant="secondary"
                    class="px-3 py-1.5 text-xs"
                    @click="openPicker(requirement, slot)"
                  >
                    {{ draftFor(requirement.key)[slot] ? t('dashboard.profile.kyc.replace') : t('dashboard.profile.kyc.browseFiles') }}
                  </UiButton>
                </div>
              </div>
            </template>

            <!-- A phone number or a short text answer -->
            <div v-else-if="isTyped(requirement)">
              <label
                :for="`kyc-${requirement.key}-value`"
                class="mb-1.5 block text-xs font-bold"
              >{{ requirement.kind === 'phone' ? t('dashboard.profile.kyc.phoneLabel') : t('dashboard.profile.kyc.textLabel') }}</label>
              <UiInput
                :id="`kyc-${requirement.key}-value`"
                v-model="draftFor(requirement.key).value"
                :type="requirement.kind === 'phone' ? 'tel' : 'text'"
                :icon="requirement.kind === 'phone' ? 'phone' : undefined"
                :placeholder="requirement.kind === 'phone' ? t('dashboard.profile.kyc.phonePlaceholder') : undefined"
                :maxlength="requirement.kind === 'phone' ? 30 : 255"
              />
            </div>

            <!-- A photo, or a document (image or PDF) -->
            <div
              v-else
              class="flex flex-col items-center gap-2 rounded-xl border border-dashed border-black/20 p-6 text-black/40 dark:border-white/20 dark:text-white/40"
              :class="draftFor(requirement.key).front && 'border-solid border-brand-500 text-black dark:text-white'"
            >
              <img
                v-if="draftFor(requirement.key).front?.previewUrl"
                :src="draftFor(requirement.key).front?.previewUrl ?? undefined"
                :alt="requirement.label"
                class="h-24 w-full max-w-xs rounded-lg object-cover"
              >
              <p
                v-else-if="draftFor(requirement.key).front"
                class="flex items-center gap-2 text-[13px]"
              >
                <UiIcon
                  name="file"
                  :size="18"
                />{{ draftFor(requirement.key).front?.file.name }}
              </p>
              <UiIcon
                v-else
                name="upload-cloud"
                :size="26"
              />
              <UiButton
                variant="secondary"
                class="px-4 py-2 text-xs"
                @click="openPicker(requirement, 'front')"
              >
                {{ draftFor(requirement.key).front ? t('dashboard.profile.kyc.replace') : t('dashboard.profile.kyc.browseFiles') }}
              </UiButton>
            </div>

            <UiButton
              type="submit"
              variant="primary"
              class="self-start"
              :disabled="!canSubmit(requirement) || submittingKey !== null"
            >
              {{ t('dashboard.profile.kyc.submitStep') }}
            </UiButton>
          </form>
        </div>
      </div>
    </section>

    <input
      ref="fileInput"
      type="file"
      :accept="fileAccept"
      class="hidden"
      :aria-label="fileLabel"
      @change="onFileChange"
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
