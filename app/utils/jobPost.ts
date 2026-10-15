import type { JobPostFormValues } from '#shared/types/jobPosts'
import { MAX_UPLOAD_IMAGE_BYTES } from './downscaleImage'

/** Mirrors the server's limits, so a mistake is caught before the request. */
export const JOB_TASKS_MAX = 15
export const JOB_TASK_LENGTH = 120
export const JOB_PHOTOS_MAX = 5
export const JOB_PHOTO_MAX_BYTES = MAX_UPLOAD_IMAGE_BYTES

/** The checklist as it will be sent: trimmed, blank rows dropped, repeats dropped, capped. */
export function normalizeTasks(tasks: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const raw of tasks) {
    const task = raw.trim().slice(0, JOB_TASK_LENGTH)
    const key = task.toLowerCase()
    if (task === '' || seen.has(key)) continue
    seen.add(key)
    result.push(task)
    if (result.length === JOB_TASKS_MAX) break
  }
  return result
}

/** Move a task one place up or down; anything out of range leaves the list as it was. */
export function moveTask(tasks: string[], index: number, direction: -1 | 1): string[] {
  const target = index + direction
  if (index < 0 || index >= tasks.length || target < 0 || target >= tasks.length) return tasks
  const next = [...tasks]
  ;[next[index], next[target]] = [next[target]!, next[index]!]
  return next
}

/** A photo the browser can pick: an image, small enough, and not past the post's limit. Returns an error key, or null. */
export function photoProblem(file: File, alreadyHave: number): 'notAnImage' | 'tooLarge' | 'tooMany' | null {
  if (!file.type.startsWith('image/')) return 'notAnImage'
  if (file.size > JOB_PHOTO_MAX_BYTES) return 'tooLarge'
  if (alreadyHave >= JOB_PHOTOS_MAX) return 'tooMany'
  return null
}

/**
 * The request body for creating or editing a post. A form is multipart because photos can ride along on create;
 * `tasks[]` repeats once per task. Empty optional fields are left out rather than sent blank.
 */
export function buildJobPostFormData(values: JobPostFormValues, photos: File[] = []): FormData {
  const body = new FormData()
  body.append('title', values.title.trim())
  body.append('description', values.description.trim())
  for (const task of normalizeTasks(values.tasks)) body.append('tasks[]', task)

  if (values.categoryId) body.append('categoryId', values.categoryId)
  if (values.provinceCode) body.append('provinceCode', values.provinceCode)
  if (values.cityCode) body.append('cityCode', values.cityCode)
  if (values.barangay) body.append('barangay', values.barangay)
  body.append('address', values.address.trim())

  if (values.preferredDate) body.append('preferredDate', values.preferredDate)
  body.append('preferredTime', values.preferredTime)

  body.append('budgetType', values.budgetType)
  // A budget only has the numbers its type uses.
  if (values.budgetType !== 'open' && values.budgetMin) body.append('budgetMin', values.budgetMin)
  if (values.budgetType === 'range' && values.budgetMax) body.append('budgetMax', values.budgetMax)

  for (const photo of photos) body.append('photos[]', photo)

  return body
}

/**
 * The JSON body for editing a post. Editing is JSON (PHP does not read multipart on PATCH), so unlike create, an
 * emptied optional field is sent as `null` to clear it.
 */
export function buildJobPostPayload(values: JobPostFormValues) {
  return {
    title: values.title.trim(),
    description: values.description.trim(),
    tasks: normalizeTasks(values.tasks),
    categoryId: values.categoryId,
    provinceCode: values.provinceCode,
    cityCode: values.cityCode,
    barangay: values.barangay || null,
    address: values.address.trim(),
    preferredDate: values.preferredDate || null,
    preferredTime: values.preferredTime,
    budgetType: values.budgetType,
    budgetMin: values.budgetType === 'open' || !values.budgetMin ? null : values.budgetMin,
    budgetMax: values.budgetType === 'range' && values.budgetMax ? values.budgetMax : null,
  }
}

/** A field error from the API for one of the checklist rows (`tasks.2`) belongs to the checklist as a whole. */
export function groupFieldErrors(errors: Record<string, string>): Record<string, string> {
  const grouped: Record<string, string> = {}
  for (const [key, message] of Object.entries(errors)) {
    const field = key.replace(/\.\d+$/, '')
    grouped[field] ??= message
  }
  return grouped
}
