// Ambient module augmentation for Nuxt's page-meta typing — lives at the
// `app/` root (alongside `app.vue`/`error.vue`) since it's app-wide, not tied
// to one page. Add fields here as `definePageMeta({ ... })` grows more of
// them; keep each one documented at its declaration, not just at first use.
export {}

declare module '#app' {
  interface PageMeta {
    /**
     * Hides `<AppBottomNav>` on this page — for drill-down/detail screens
     * (e.g. `providers/[id].vue`) that use a back-header + their own sticky
     * action bar instead of the tab bar, matching native push-navigation
     * (see CLAUDE.md's native-feel mobile redesign notes).
     */
    hideBottomNav?: boolean
  }
}
