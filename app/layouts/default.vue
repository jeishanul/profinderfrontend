<template>
  <div class="flex min-h-screen flex-col">
    <AppHeader />
    <main class="flex-1 pb-20 md:pb-0">
      <slot />
    </main>
    <AppFooter class="hidden md:block" />
    <AppFooterCompact class="pb-24 md:hidden" />
    <UiScrollToTopButton />
    <MarketplaceAuthModal />
    <AppBottomNav />
    <AppMoreMenu />
  </div>
</template>
