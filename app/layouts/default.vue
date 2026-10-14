<script setup lang="ts">
// Overlays most visitors never open are loaded the first time they are needed (see `useMountWhenNeeded`): their code
// and CSS stay out of the first page load and their closed markup out of every server render. The login modal is
// also needed when the OAuth callback lands with a `?social=` result for it to handle.
const authModal = useAuthModal()
const moreMenu = useMoreMenu()
const route = useRoute()
const authModalMounted = useMountWhenNeeded(() => authModal.isOpen.value || route.query.social !== undefined)
const moreMenuMounted = useMountWhenNeeded(() => moreMenu.isOpen.value)
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <AppHeader />
    <main class="flex-1 pb-20 md:pb-0">
      <slot />
    </main>
    <AppFooter class="hidden md:block" />
    <AppFooterCompact class="pb-24 md:hidden" />
    <UiScrollToTopButton />
    <LazyMarketplaceAuthModal v-if="authModalMounted" />
    <AppBottomNav />
    <LazyAppMoreMenu v-if="moreMenuMounted" />
  </div>
</template>
