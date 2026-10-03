<script setup lang="ts">
const props = defineProps<{
  error: { statusCode: number, statusMessage?: string }
}>()

const { t } = useI18n()
const localePath = useLocalePath()
const isDev = import.meta.dev

useSeoMeta({ title: t('errors.seoTitle'), robots: 'noindex, nofollow' })

function handleError() {
  clearError({ redirect: localePath('/') })
}
</script>

<template>
  <NuxtLayout name="default">
    <div class="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <p class="text-sm font-medium text-brand-600">
        {{ props.error.statusCode }}
      </p>
      <h1 class="text-2xl font-bold">
        {{ props.error.statusCode === 404 ? t('errors.notFound') : t('errors.somethingWrong') }}
      </h1>
      <p
        v-if="isDev && props.error.statusMessage"
        class="max-w-md text-xs text-black/40 dark:text-white/40"
      >
        {{ props.error.statusMessage }}
      </p>
      <UiButton @click="handleError">
        {{ t('errors.goHome') }}
      </UiButton>
    </div>
  </NuxtLayout>
</template>
