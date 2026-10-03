/** Mirrors the server's `image|max:5120` rule so a too-large file is rejected before it's uploaded. */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

/** Validates and uploads one image file to `endpoint`; returns the parsed response, or `null` (with a toast) on failure. */
export function useImageUpload() {
  const { t } = useI18n()
  const toast = useToast()

  async function uploadImage<T>(endpoint: string, file: File): Promise<T | null> {
    if (!file.type.startsWith('image/')) {
      toast.error(t('dashboard.profile.errors.notAnImage'))
      return null
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error(t('dashboard.profile.errors.imageTooLarge'))
      return null
    }
    const body = new FormData()
    body.append('file', file)
    try {
      return await useApiFetch<T>(endpoint, { method: 'POST', body })
    }
    catch (error) {
      toast.error(apiErrorMessage(error, t('dashboard.profile.errors.upload')))
      return null
    }
  }

  return { uploadImage }
}
