<script setup lang="ts">
// Catch-all: without this, an unmatched route renders a blank page instead of
// triggering app/error.vue, since Vue Router has no match to hand off to Nuxt.
const { t } = useI18n()
throw createError({ statusCode: 404, statusMessage: t('errors.notFound'), fatal: false })
</script>

<template>
  <div />
</template>
