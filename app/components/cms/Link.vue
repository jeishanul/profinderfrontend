<script setup lang="ts">
// Auto-imported as <CmsLink />. A link the admin typed: a site path stays in-app (and keeps the locale prefix),
// anything else is a plain anchor, and an unsafe or empty value renders as a non-link span instead of an `href`.
// `newTab` opens any link in a new tab; external web addresses always do.
const props = defineProps<{
  to: string | null | undefined
  newTab?: boolean
}>()

const localePath = useLocalePath()

const safeTo = computed(() => (isSafeLink(props.to) ? props.to : null))
const isInternal = computed(() => (safeTo.value ? isInternalPath(safeTo.value) : false))
const opensNewTab = computed(() => Boolean(props.newTab) || (safeTo.value ? /^https?:/i.test(safeTo.value) : false))
// A new tab leaves the router, so the locale prefix has to be put on the address by hand.
const href = computed(() => (safeTo.value && isInternal.value ? localePath(safeTo.value) : safeTo.value))
</script>

<template>
  <NuxtLinkLocale
    v-if="safeTo && isInternal && !opensNewTab"
    :to="safeTo"
  >
    <slot />
  </NuxtLinkLocale>
  <a
    v-else-if="safeTo"
    :href="href!"
    :target="opensNewTab ? '_blank' : undefined"
    :rel="opensNewTab ? 'noopener noreferrer' : undefined"
  >
    <slot />
  </a>
  <span v-else>
    <slot />
  </span>
</template>
