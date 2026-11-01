<script setup lang="ts">
// One category of the storefront (and everything under it). A fresh component per category, so the listing's
// filters and head never carry over from the previous one.
definePageMeta({ key: route => route.path })

const route = useRoute()
const slug = computed(() => String(route.params.slug))
</script>

<template>
  <ShopProductListing :category="slug" />
</template>
