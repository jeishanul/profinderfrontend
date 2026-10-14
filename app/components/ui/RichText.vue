<script setup lang="ts">
// Auto-imported as <UiRichText />. Admin-written HTML (section bodies, SEO copy, ...) with the site's prose styling.
// The backend runs it through an allowlist sanitiser on save and again on the way out, which is what makes `v-html`
// safe here — never pass it text that didn't come from the CMS.
defineProps<{
  html: string | null | undefined
}>()
</script>

<template>
  <!-- eslint-disable vue/no-v-html -->
  <div
    v-if="html && html.trim()"
    class="prose max-w-none text-black/80 dark:text-white/80 [&_a]:font-semibold [&_a]:text-brand-700 [&_a]:underline hover:[&_a]:text-brand-800 dark:[&_a]:text-brand-400 dark:hover:[&_a]:text-brand-300 [&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-brand-500 [&_blockquote]:pl-4 [&_blockquote]:italic [&_h2]:mt-6 [&_h2]:mb-3 [&_img]:my-5 [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-2xl [&_h2]:text-2xl [&_h2]:font-bold [&_h3]:mt-5 [&_h3]:mb-2 [&_h3]:text-xl [&_h3]:font-semibold [&_h4]:mt-4 [&_h4]:mb-2 [&_h4]:font-semibold [&_li]:mb-1.5 [&_ol]:my-3 [&_ol]:ml-6 [&_ol]:list-decimal [&_p]:mb-3 [&_p]:leading-relaxed [&_ul]:my-3 [&_ul]:ml-6 [&_ul]:list-disc"
    v-html="html"
  />
  <!-- eslint-enable vue/no-v-html -->
</template>
