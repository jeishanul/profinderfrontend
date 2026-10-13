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

// A server or network failure is usually temporary: offer to try the same page again.
const canRetry = computed(() => props.error.statusCode !== 404)
const route = useRoute()
function retry() {
  clearError({ redirect: route.fullPath })
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
      <div class="flex flex-wrap justify-center gap-2.5">
        <UiButton
          v-if="canRetry"
          @click="retry"
        >
          {{ t('errors.retry') }}
        </UiButton>
        <UiButton
          :variant="canRetry ? 'ghost' : 'primary'"
          @click="handleError"
        >
          {{ t('errors.goHome') }}
        </UiButton>
      </div>
    </div>
  </NuxtLayout>
</template>
