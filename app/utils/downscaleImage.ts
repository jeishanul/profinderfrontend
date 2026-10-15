/** Mirrors the server's `max:15360` image rule, checked after `downscaleImage` so a big phone photo still gets through. */
export const MAX_UPLOAD_IMAGE_BYTES = 15 * 1024 * 1024

/** Longest side sent to the server. It makes the final, smaller copy for each slot; this only saves upload time. */
const MAX_SIDE = 2560

/** Files under this size and within MAX_SIDE are sent untouched: shrinking them saves almost nothing. */
const SMALL_ENOUGH_BYTES = 1.5 * 1024 * 1024

/**
 * Shrinks a large photo in the browser before upload, so a 10 MB phone photo goes up as ~1 MB and stays under the
 * server's pixel cap. It also applies the EXIF rotation, and a browser that can decode HEIC (Safari) turns it into a
 * JPEG the server can read. GIFs (animation) and SVGs are left alone. Any failure returns the original file: the
 * server still validates and optimises whatever arrives.
 */
export async function downscaleImage(file: File): Promise<File> {
  if (!import.meta.client || !file.type.startsWith('image/') || ['image/gif', 'image/svg+xml'].includes(file.type)) return file

  let bitmap: ImageBitmap | undefined
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
    const browserCanUpload = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
    if (scale === 1 && file.size <= SMALL_ENOUGH_BYTES && browserCanUpload) return file

    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

    // PNGs may be transparent: WebP keeps that (a browser without WebP encoding falls back to PNG). Photos go as JPEG.
    const type = file.type === 'image/png' ? 'image/webp' : 'image/jpeg'
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, type, 0.9))
    if (!blob || (blob.size >= file.size && browserCanUpload)) return file

    const extension = blob.type.split('/')[1] === 'jpeg' ? 'jpg' : blob.type.split('/')[1]
    const name = `${file.name.replace(/\.[^.]+$/, '') || 'photo'}.${extension}`
    return new File([blob], name, { type: blob.type, lastModified: file.lastModified })
  }
  catch {
    return file
  }
  finally {
    bitmap?.close()
  }
}
