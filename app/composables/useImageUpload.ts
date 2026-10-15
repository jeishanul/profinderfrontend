/** Validates and uploads one image file to `endpoint`; returns the parsed response, or `null` (with a toast) on failure. */
export function useImageUpload() {
  const { t } = useI18n()
  const toast = useToast()

  async function uploadImage<T>(endpoint: string, picked: File): Promise<T | null> {
    if (!picked.type.startsWith('image/')) {
      toast.error(t('dashboard.profile.errors.notAnImage'))
      return null
    }
    // A big phone photo is shrunk before upload; the server makes the final, optimised copy.
    const file = await downscaleImage(picked)
    if (file.size > MAX_UPLOAD_IMAGE_BYTES) {
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
