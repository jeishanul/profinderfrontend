<script setup lang="ts">
import type { PurchaseRecord } from '#shared/types/dashboard'

// Auto-imported as <DashboardPurchasesTable/>. Used both on the dashboard
// overview (a 3-row preview) and the full my-purchases page.
const props = withDefaults(
  defineProps<{
    purchases: PurchaseRecord[]
    limit?: number
  }>(),
  { limit: undefined },
)

const { t } = useI18n()
const localePath = useLocalePath()

const rows = computed(() => (props.limit ? props.purchases.slice(0, props.limit) : props.purchases))

const AVATAR_TINTS = [
  'bg-brand-50 text-brand-700 dark:bg-brand-700/20 dark:text-brand-100',
  'bg-accent-50 text-accent-700 dark:bg-accent-700/20 dark:text-accent-100',
  'bg-black/5 text-black/60 dark:bg-white/10 dark:text-white/60',
]

function avatarClass(index: number) {
  return AVATAR_TINTS[index % AVATAR_TINTS.length]
}

// "Message" opens (or creates) a real conversation with this provider.
// "Book again" searches Browse for the same category.
async function messageProvider(purchase: PurchaseRecord) {
  const conversation = await useApiFetch<{ id: string }>('/api/dashboard/conversations', {
    method: 'POST',
    body: { providerId: Number(purchase.providerId) },
  })
  await navigateTo(localePath({ path: '/messages', query: { conversation: conversation.id } }))
}

function bookAgain(purchase: PurchaseRecord) {
  navigateTo(localePath({ path: '/browse', query: { category: purchase.categoryId } }))
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
        v-for="(purchase, index) in rows"
        :key="purchase.id"
        class="rounded-2xl border border-black/10 p-4 dark:border-white/10"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-2.5 font-semibold">
            <span
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold"
              :class="avatarClass(index)"
            >
              {{ initialsFor(purchase.providerName) }}
            </span>
            <div>
              <div>{{ purchase.providerName }}</div>
              <div class="mt-0.5 text-xs font-normal text-black/60 dark:text-white/60">
                {{ t(`marketplace.categories.${purchase.categoryId}.label`) }} &middot; {{ purchase.date }}
              </div>
            </div>
          </div>
          <DashboardStatusBadge :status="purchase.status" />
        </div>
        <div class="mt-3.5 flex gap-2">
          <UiButton
            variant="ghost"
            size="sm"
            class="flex-1 justify-center"
            @click="messageProvider(purchase)"
          >
            {{ t('dashboard.table.message') }}
          </UiButton>
          <UiButton
            variant="secondary"
            size="sm"
            class="flex-1 justify-center"
            @click="bookAgain(purchase)"
          >
            {{ t('dashboard.table.bookAgain') }}
          </UiButton>
        </div>
      </div>
    </div>

    <div class="hidden overflow-x-auto sm:block">
      <table class="w-full min-w-[680px] border-collapse text-sm">
        <thead>
          <tr class="border-b border-black/10 text-left text-xs font-bold tracking-wide text-black/40 uppercase dark:border-white/10 dark:text-white/40">
            <th class="pb-3 pr-3 font-bold">
              {{ t('dashboard.table.provider') }}
            </th>
            <th class="pb-3 pr-3 font-bold">
              {{ t('dashboard.table.service') }}
            </th>
            <th class="pb-3 pr-3 font-bold">
              {{ t('dashboard.table.date') }}
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
            v-for="(purchase, index) in rows"
            :key="purchase.id"
            class="border-b border-black/10 last:border-0 dark:border-white/10"
          >
            <td class="py-3.5 pr-3">
              <div class="flex items-center gap-2.5 font-semibold">
                <span
                  class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                  :class="avatarClass(index)"
                >
                  {{ initialsFor(purchase.providerName) }}
                </span>
                {{ purchase.providerName }}
              </div>
            </td>
            <td class="py-3.5 pr-3 text-black/60 dark:text-white/60">
              {{ t(`marketplace.categories.${purchase.categoryId}.label`) }}
            </td>
            <td class="py-3.5 pr-3 text-black/60 dark:text-white/60">
              {{ purchase.date }}
            </td>
            <td class="py-3.5 pr-3">
              <DashboardStatusBadge :status="purchase.status" />
            </td>
            <td class="py-3.5">
              <div class="flex justify-end gap-2">
                <UiButton
                  variant="ghost"
                  size="sm"
                  @click="messageProvider(purchase)"
                >
                  {{ t('dashboard.table.message') }}
                </UiButton>
                <UiButton
                  variant="secondary"
                  size="sm"
                  @click="bookAgain(purchase)"
                >
                  {{ t('dashboard.table.bookAgain') }}
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
      {{ t('dashboard.purchases.empty') }}
    </p>
  </div>
</template>
