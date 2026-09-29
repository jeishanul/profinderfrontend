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

const { t } = useI18n()
const localePath = useLocalePath()

const rows = computed(() => (props.limit ? props.clients.slice(0, props.limit) : props.clients))

const AVATAR_TINTS = [
  'bg-brand-50 text-brand-700 dark:bg-brand-700/20 dark:text-brand-100',
  'bg-accent-50 text-accent-700 dark:bg-accent-700/20 dark:text-accent-100',
  'bg-black/5 text-black/60 dark:bg-white/10 dark:text-white/60',
]

function avatarClass(index: number) {
  return AVATAR_TINTS[index % AVATAR_TINTS.length]
}

// Opens (or creates) a real conversation with this client.
async function messageClient(client: ClientServed) {
  const conversation = await useApiFetch<{ id: string }>('/api/dashboard/conversations', {
    method: 'POST',
    body: { consumerUserId: Number(client.clientUserId) },
  })
  await navigateTo(localePath({ path: '/messages', query: { conversation: conversation.id } }))
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
                {{ t(`marketplace.categories.${client.categoryId}.label`) }} &middot; {{ client.date }}
              </div>
            </div>
          </div>
          <DashboardStatusBadge :status="client.status" />
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
            <span class="font-semibold">${{ client.amountUsd }}</span>
          </div>
          <UiButton
            variant="ghost"
            size="sm"
            @click="messageClient(client)"
          >
            {{ t('dashboard.table.message') }}
          </UiButton>
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
              <span class="sr-only">{{ t('dashboard.table.message') }}</span>
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
              {{ t(`marketplace.categories.${client.categoryId}.label`) }}
            </td>
            <td class="py-3.5 pr-3 text-black/60 dark:text-white/60">
              {{ client.date }}
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
              ${{ client.amountUsd }}
            </td>
            <td class="py-3.5 pr-3">
              <DashboardStatusBadge :status="client.status" />
            </td>
            <td class="py-3.5">
              <UiButton
                variant="ghost"
                size="sm"
                @click="messageClient(client)"
              >
                {{ t('dashboard.table.message') }}
              </UiButton>
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
