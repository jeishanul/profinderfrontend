<script setup lang="ts">
// Auto-imported as <MarketplaceTrustStats />.
const { t } = useI18n()

const STATS: Array<{ id: string, icon: IconName, value: string }> = [
  { id: 'pros', icon: 'users', value: '12,000+' },
  { id: 'categories', icon: 'briefcase', value: '40+' },
  { id: 'satisfaction', icon: 'star', value: '98%' },
]
</script>

<template>
  <section class="mx-auto max-w-6xl px-4 pt-8 sm:px-6 sm:pt-24 lg:px-10">
    <div class="grid gap-6 rounded-3xl border border-black/10 bg-white/60 px-8 py-8 shadow-lg shadow-black/5 backdrop-blur-xl dark:border-white/10 dark:bg-black/30 sm:grid-cols-3">
      <div
        v-for="(stat, index) in STATS"
        :key="stat.id"
        class="flex items-center gap-4"
        :class="index > 0 ? 'sm:border-l sm:border-black/10 sm:pl-6 sm:dark:border-white/10' : ''"
      >
        <div
          class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
          :class="index % 2 === 0 ? 'bg-brand-50 text-brand-700 dark:bg-brand-700/20 dark:text-brand-100' : 'bg-accent-50 text-accent-700 dark:bg-accent-700/20 dark:text-accent-100'"
        >
          <UiIcon
            :name="stat.icon"
            :filled="stat.icon === 'star'"
            :size="22"
          />
        </div>
        <div>
          <p class="font-display text-2xl font-bold">
            {{ stat.value }}
          </p>
          <p class="text-sm text-black/60 dark:text-white/60">
            {{ t(`marketplace.trustStats.${stat.id}`) }}
          </p>
        </div>
      </div>
    </div>
  </section>
</template>
