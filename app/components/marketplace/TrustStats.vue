<script setup lang="ts">
// Auto-imported as <MarketplaceTrustStats />.
const DEFAULT_ICONS: IconName[] = ['users', 'briefcase', 'star']

// Only the admin's real figures (which can be live counts — see
// `ContentTokens` on the backend) — no hardcoded "12,000+ pros" fallback
// numbers that would show on a brand-new install with zero real providers.
const content = useContentSection('trust_stats')
const stats = computed(() => content.value.map((item, index) => ({
  id: `cms-${index}`,
  icon: knownIcon(item.icon, DEFAULT_ICONS[index % DEFAULT_ICONS.length]!),
  value: item.value ?? '',
  label: item.title ?? '',
})))
</script>

<template>
  <section
    v-if="stats.length > 0"
    class="mx-auto max-w-6xl px-4 pt-8 sm:px-6 sm:pt-24 lg:px-10"
  >
    <div class="grid gap-6 rounded-3xl border border-black/10 bg-white/60 px-8 py-8 shadow-lg shadow-black/5 backdrop-blur-xl dark:border-white/10 dark:bg-black/30 sm:grid-cols-3">
      <div
        v-for="(stat, index) in stats"
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
            {{ stat.label }}
          </p>
        </div>
      </div>
    </div>
  </section>
</template>
