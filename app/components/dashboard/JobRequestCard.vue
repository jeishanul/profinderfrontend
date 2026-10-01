<script setup lang="ts">
import type { MessageMeta } from '#shared/types/dashboard'

// Auto-imported as <DashboardJobRequestCard/>. The structured job request a
// client sends when they start a conversation from a provider's page (see
// <MarketplaceJobRequestModal/>): what they need, when and where. Shown in
// the thread so the provider can quote straight away.
const props = defineProps<{
  meta: MessageMeta
  text: string
  fromMe: boolean
  /** The viewer is the provider and may answer this request with a quote. */
  canQuote?: boolean
  /** The viewer is the provider but isn't verified yet, so quotes are refused. */
  needsVerification?: boolean
}>()

defineEmits<{
  'send-quote': []
}>()

const { t, locale } = useI18n()

// "preferredDate" is a plain calendar date (no timezone), so format it as
// local noon to keep the day from drifting across a timezone boundary.
const preferredWhen = computed(() => {
  if (!props.meta.preferredDate) return null
  const date = formatDate(new Date(`${props.meta.preferredDate}T12:00:00`), locale.value)
  return props.meta.preferredTime ? `${date} · ${props.meta.preferredTime}` : date
})
</script>

<template>
  <div
    class="w-72 max-w-full overflow-hidden rounded-xl border bg-white text-black dark:bg-black/40 dark:text-white"
    :class="fromMe ? 'border-brand-600/40' : 'border-black/10 dark:border-white/15'"
  >
    <div class="flex items-center gap-2 border-b border-black/10 bg-brand-50 px-3.5 py-2 dark:border-white/10 dark:bg-brand-700/20">
      <UiIcon
        name="calendar"
        :size="14"
        class="text-brand-700 dark:text-brand-100"
      />
      <span class="text-xs font-bold text-brand-700 dark:text-brand-100">{{ t('dashboard.messages.jobRequest.heading') }}</span>
    </div>
    <div class="flex flex-col gap-2 px-3.5 py-3 text-sm">
      <p class="whitespace-pre-line">
        {{ text }}
      </p>
      <dl class="flex flex-col gap-1 text-xs text-black/70 dark:text-white/70">
        <div
          v-if="meta.serviceTitle"
          class="flex items-start gap-1.5"
        >
          <UiIcon
            name="briefcase"
            :size="12"
            class="mt-0.5 shrink-0 text-black/40 dark:text-white/40"
          />
          <dd>{{ meta.serviceTitle }}</dd>
        </div>
        <div
          v-if="preferredWhen"
          class="flex items-start gap-1.5"
        >
          <UiIcon
            name="calendar"
            :size="12"
            class="mt-0.5 shrink-0 text-black/40 dark:text-white/40"
          />
          <dd class="font-semibold">
            {{ preferredWhen }}
          </dd>
        </div>
        <div
          v-if="meta.address"
          class="flex items-start gap-1.5"
        >
          <UiIcon
            name="map-pin"
            :size="12"
            class="mt-0.5 shrink-0 text-black/40 dark:text-white/40"
          />
          <dd>{{ meta.address }}</dd>
        </div>
      </dl>
      <UiButton
        v-if="canQuote"
        size="sm"
        class="mt-1 self-start"
        @click="$emit('send-quote')"
      >
        {{ t('dashboard.messages.jobRequest.sendQuote') }}
      </UiButton>
      <NuxtLinkLocale
        v-else-if="needsVerification"
        :to="{ path: '/profile', query: { tab: 'kyc' } }"
        class="mt-1 text-xs font-semibold text-accent-700 underline dark:text-accent-100"
      >
        {{ t('dashboard.messages.quote.verifyToSend') }}
      </NuxtLinkLocale>
    </div>
  </div>
</template>
