<script setup lang="ts">
import type { HomeSection } from '#shared/types/cms'

// Auto-imported as <CmsBlock />. Renders one admin-added landing section by its block type. A type this build
// doesn't know (e.g. added by a newer backend) renders nothing rather than breaking the page.
defineProps<{
  section: HomeSection
}>()
</script>

<template>
  <CmsImageText
    v-if="section.type === 'image_text'"
    :section="section"
  />
  <CmsCtaBanner
    v-else-if="section.type === 'cta_banner'"
    :section="section"
  />
  <CmsFeaturesGrid
    v-else-if="section.type === 'features_grid'"
    :section="section"
  />
  <CmsLogoStrip
    v-else-if="section.type === 'logo_strip'"
    :section="section"
  />
  <MarketplaceTrustStats
    v-else-if="section.type === 'stats'"
    :section="section"
  />
  <CmsRichText
    v-else-if="section.type === 'rich_text'"
    :section="section"
  />
  <CmsImageGallery
    v-else-if="section.type === 'image_gallery'"
    :section="section"
  />
</template>
