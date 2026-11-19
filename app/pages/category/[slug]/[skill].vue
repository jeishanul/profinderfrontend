<script setup lang="ts">
// A sub-category's landing page (/category/{category}/{skill}). Keyed by path, like the category page. The landing
// component loads the SEO content (and 404s) together with the provider list.
definePageMeta({ key: route => route.path })

const route = useRoute()
const slug = String(route.params.slug || '')
const skill = String(route.params.skill || '')
</script>

<template>
  <MarketplaceCategoryLanding
    :category-slug="slug"
    :skill-slug="skill"
  />
</template>
