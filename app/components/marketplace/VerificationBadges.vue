<script setup lang="ts">
import type { VerificationBadge } from '#shared/types/billing'

// Auto-imported as <MarketplaceVerificationBadges/>. The paid verification badges a provider has on show
// ("Verified identity", "Verified business"…), as small pills next to the `verified` shield. Renders nothing
// when there are none, so callers can drop it in unconditionally.
const props = withDefaults(defineProps<{
  badges?: VerificationBadge[] | null
  size?: 'sm' | 'md'
}>(), { badges: () => [], size: 'sm' })

const { t } = useI18n()
const list = computed(() => props.badges ?? [])
</script>

<template>
  <ul
    v-if="list.length > 0"
    class="flex flex-wrap gap-1.5"
    :aria-label="t('marketplace.provider.badgesLabel')"
  >
    <li
      v-for="badge in list"
      :key="badge.slug"
    >
      <UiTag
        variant="primary"
        :size="props.size"
      >
        <UiIcon
          name="shield-check"
          filled
          :size="props.size === 'sm' ? 10 : 12"
        />
        {{ badge.label }}
      </UiTag>
    </li>
  </ul>
</template>
