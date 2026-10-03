<script setup lang="ts">
import type { ClientServed } from '#shared/types/dashboard'

// Auto-imported as <DashboardClientsTable/>. Used both on the dashboard
// overview (a 3-row preview) and the full clients-served page.
const props = withDefaults(
  defineProps<{
    clients: ClientServed[]
    limit?: number
  }>(),
  { limit: undefined },
)

const { t, locale } = useI18n()
const { money } = useSiteSettings()
const categoryLabel = useCategoryLabel()
const localePath = useLocalePath()
const toast = useToast()
const drawer = useBookingDrawer()

const rows = computed(() => (props.limit ? props.clients.slice(0, props.limit) : props.clients))

const AVATAR_TINTS = [
  'bg-brand-50 text-brand-700 dark:bg-brand-700/20 dark:text-brand-100',
  'bg-accent-50 text-accent-700 dark:bg-accent-700/20 dark:text-accent-100',
  'bg-black/5 text-black/60 dark:bg-white/10 dark:text-white/60',
]

function avatarClass(index: number) {
  return AVATAR_TINTS[index % AVATAR_TINTS.length]
}

const serviceLabel = (client: ClientServed) => client.serviceTitle ?? categoryLabel(client.categoryId, client.categoryName)

// Opens the thread this booking came from, or finds/creates one with the client.
const messagingId = ref<string | null>(null)
async function messageClient(client: ClientServed) {
  if (messagingId.value) return
  messagingId.value = client.id
  try {
    const conversationId = client.conversationId ?? (await useApiFetch<{ id: string }>('/api/dashboard/conversations', {
      method: 'POST',
      body: { consumerUserId: Number(client.clientUserId) },
    })).id
    await navigateTo(localePath({ path: '/messages', query: { conversation: conversationId } }))
  }
  catch (error) {
    toast.error(apiErrorMessage(error, t('dashboard.table.messageFailed')))
  }
  finally {
    messagingId.value = null
  }
}
</script>

<template>
  <div>
    <!-- Below `sm`, a table can only ever be a horizontally-scrolling strip
         of cut-off columns — not a native-feeling list — so it becomes real
         stacked cards instead (see CLAUDE.md's mobile-first redesign notes);
         the table below (`hidden sm:block`) takes over from `sm` up. -->
    <div class="flex flex-col gap-3 sm:hidden">
      <div
        v-for="(client, index) in rows"
        :key="client.id"
        class="rounded-2xl border border-black/10 p-4 dark:border-white/10"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-2.5 font-semibold">
            <span
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold"
              :class="avatarClass(index)"
            >
              {{ initialsFor(client.clientName) }}
            </span>
            <div>
              <div class="flex items-center gap-1.5">
                {{ client.clientName }}
                <UiTag
                  v-if="client.repeatClient"
                  variant="neutral"
                  size="sm"
                >
                  {{ t('dashboard.table.repeatBadge') }}
                </UiTag>
              </div>
              <div class="mt-0.5 text-xs font-normal text-black/60 dark:text-white/60">
                {{ serviceLabel(client) }} &middot; {{ formatDateTime(client.scheduledAt, locale) }}
              </div>
            </div>
          </div>
          <div class="flex flex-col items-end gap-1.5">
            <DashboardStatusBadge :status="client.status" />
            <DashboardPaymentBadge
              v-if="client.status !== 'cancelled'"
              :status="client.paymentStatus"
            />
          </div>
        </div>
        <div class="mt-3.5 flex items-center justify-between gap-3 border-t border-black/10 pt-3 dark:border-white/10">
          <div class="flex items-center gap-3 text-sm">
            <span
              v-if="client.rating"
              class="inline-flex items-center gap-1 text-black/60 dark:text-white/60"
            >
              <UiIcon
                name="star"
                filled
                :size="13"
                class="text-accent-600"
              />
              {{ client.rating.toFixed(1) }}
            </span>
            <span class="font-semibold">{{ money(client.amountUsd) }}</span>
          </div>
          <div class="flex gap-2">
            <UiButton
              variant="secondary"
              size="sm"
              @click="drawer.open(client.id)"
            >
              {{ t('dashboard.table.details') }}
            </UiButton>
            <UiButton
              variant="ghost"
              size="sm"
              :disabled="messagingId === client.id"
              @click="messageClient(client)"
            >
              {{ t('dashboard.table.message') }}
            </UiButton>
          </div>
        </div>
      </div>
    </div>

    <div class="hidden overflow-x-auto sm:block">
      <table class="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr class="border-b border-black/10 text-left text-xs font-bold tracking-wide text-black/40 uppercase dark:border-white/10 dark:text-white/40">
            <th class="pb-3 pr-3 font-bold">
              {{ t('dashboard.table.client') }}
            </th>
            <th class="pb-3 pr-3 font-bold">
              {{ t('dashboard.table.service') }}
            </th>
            <th class="pb-3 pr-3 font-bold">
              {{ t('dashboard.table.date') }}
            </th>
            <th class="pb-3 pr-3 font-bold">
              {{ t('dashboard.table.rating') }}
            </th>
            <th class="pb-3 pr-3 font-bold">
              {{ t('dashboard.table.amount') }}
            </th>
            <th class="pb-3 pr-3 font-bold">
              {{ t('dashboard.table.status') }}
            </th>
            <th class="pb-3 font-bold">
              <span class="sr-only">{{ t('dashboard.table.actions') }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(client, index) in rows"
            :key="client.id"
            class="border-b border-black/10 last:border-0 dark:border-white/10"
          >
            <td class="py-3.5 pr-3">
              <div class="flex items-center gap-2.5 font-semibold">
                <span
                  class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                  :class="avatarClass(index)"
                >
                  {{ initialsFor(client.clientName) }}
                </span>
                {{ client.clientName }}
                <UiTag
                  v-if="client.repeatClient"
                  variant="neutral"
                  size="sm"
                >
                  {{ t('dashboard.table.repeatBadge') }}
                </UiTag>
              </div>
            </td>
            <td class="py-3.5 pr-3 text-black/60 dark:text-white/60">
              {{ serviceLabel(client) }}
            </td>
            <td class="py-3.5 pr-3 text-black/60 dark:text-white/60">
              {{ formatDateTime(client.scheduledAt, locale) }}
            </td>
            <td class="py-3.5 pr-3 text-black/60 dark:text-white/60">
              <span
                v-if="client.rating"
                class="inline-flex items-center gap-1"
              >
                <UiIcon
                  name="star"
                  filled
                  :size="13"
                  class="text-accent-600"
                />
                {{ client.rating.toFixed(1) }}
              </span>
              <span v-else>—</span>
            </td>
            <td class="py-3.5 pr-3 font-semibold">
              {{ money(client.amountUsd) }}
            </td>
            <td class="py-3.5 pr-3">
              <div class="flex flex-wrap items-center gap-1.5">
                <DashboardStatusBadge :status="client.status" />
                <DashboardPaymentBadge
                  v-if="client.status !== 'cancelled'"
                  :status="client.paymentStatus"
                />
              </div>
            </td>
            <td class="py-3.5">
              <div class="flex justify-end gap-2">
                <UiButton
                  variant="secondary"
                  size="sm"
                  @click="drawer.open(client.id)"
                >
                  {{ t('dashboard.table.details') }}
                </UiButton>
                <UiButton
                  variant="ghost"
                  size="sm"
                  :disabled="messagingId === client.id"
                  @click="messageClient(client)"
                >
                  {{ t('dashboard.table.message') }}
                </UiButton>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p
      v-if="rows.length === 0"
      class="py-8 text-center text-sm text-black/50 dark:text-white/50"
    >
      {{ t('dashboard.clients.empty') }}
    </p>
  </div>
</template>
