<script setup lang="ts">
// One component per category: moving between two landing pages rebuilds it, so head, schema and filters never go stale.
// The landing component loads the SEO content (and 404s) together with the provider list.
definePageMeta({ key: route => route.path })

const route = useRoute()
const slug = String(route.params.slug || '')
</script>

<template>
  <MarketplaceCategoryLanding :category-slug="slug" />
</template>
