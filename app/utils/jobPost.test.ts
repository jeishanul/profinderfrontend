import { describe, expect, it } from 'vitest'
import { buildJobPostFormData, buildJobPostPayload, groupFieldErrors, JOB_PHOTOS_MAX, JOB_TASKS_MAX, moveTask, normalizeTasks, photoProblem } from './jobPost'
import type { JobPostFormValues } from '#shared/types/jobPosts'

const values = (overrides: Partial<JobPostFormValues> = {}): JobPostFormValues => ({
  title: '  Clean two rooms ',
  description: ' Deep clean. ',
  tasks: ['Sweep', 'Mop'],
  categoryId: 'cleaning',
  provinceCode: '1376',
  cityCode: '137602',
  barangay: null,
  address: ' 12 Sampaguita St ',
  preferredDate: '',
  preferredTime: 'flexible',
  budgetType: 'open',
  budgetMin: '',
  budgetMax: '',
  ...overrides,
})

describe('normalizeTasks', () => {
  it('trims, drops blanks and repeats (ignoring case), and keeps the order', () => {
    expect(normalizeTasks(['  Sweep ', '', 'mop', 'sweep', '   ', 'Wipe windows'])).toEqual(['Sweep', 'mop', 'Wipe windows'])
  })

  it('caps the list and each task at the server limits', () => {
    expect(normalizeTasks(Array.from({ length: 30 }, (_, i) => `task ${i}`))).toHaveLength(JOB_TASKS_MAX)
    expect(normalizeTasks(['x'.repeat(300)])[0]).toHaveLength(120)
  })
})

describe('moveTask', () => {
  it('swaps a task with its neighbour', () => {
    expect(moveTask(['a', 'b', 'c'], 1, -1)).toEqual(['b', 'a', 'c'])
    expect(moveTask(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'c', 'b'])
  })

  it('leaves the list alone at the edges', () => {
    const list = ['a', 'b']
    expect(moveTask(list, 0, -1)).toBe(list)
    expect(moveTask(list, 1, 1)).toBe(list)
    expect(moveTask(list, 9, 1)).toBe(list)
  })
})

describe('photoProblem', () => {
  const image = (size = 1000) => new File([new Uint8Array(size)], 'a.jpg', { type: 'image/jpeg' })

  it('accepts a small image', () => {
    expect(photoProblem(image(), 0)).toBeNull()
  })

  it('refuses non-images, big files and too many photos', () => {
    expect(photoProblem(new File(['x'], 'a.pdf', { type: 'application/pdf' }), 0)).toBe('notAnImage')
    expect(photoProblem(image(6 * 1024 * 1024), 0)).toBe('tooLarge')
    expect(photoProblem(image(), JOB_PHOTOS_MAX)).toBe('tooMany')
  })
})

describe('buildJobPostFormData', () => {
  it('sends the trimmed fields, one tasks[] entry per task, and nothing blank', () => {
    const body = buildJobPostFormData(values())

    expect(body.get('title')).toBe('Clean two rooms')
    expect(body.get('address')).toBe('12 Sampaguita St')
    expect(body.getAll('tasks[]')).toEqual(['Sweep', 'Mop'])
    expect(body.get('categoryId')).toBe('cleaning')
    expect(body.has('preferredDate')).toBe(false)
    expect(body.has('barangay')).toBe(false)
    expect(body.has('budgetMin')).toBe(false)
  })

  it('sends only the budget numbers the chosen type uses', () => {
    expect(buildJobPostFormData(values({ budgetType: 'fixed', budgetMin: '500', budgetMax: '900' })).has('budgetMax')).toBe(false)

    const range = buildJobPostFormData(values({ budgetType: 'range', budgetMin: '500', budgetMax: '900' }))
    expect([range.get('budgetMin'), range.get('budgetMax')]).toEqual(['500', '900'])

    // An "open to offers" post ignores stale numbers left in the inputs.
    expect(buildJobPostFormData(values({ budgetType: 'open', budgetMin: '500' })).has('budgetMin')).toBe(false)
  })

  it('attaches photos', () => {
    const files = [new File(['a'], 'a.jpg', { type: 'image/jpeg' }), new File(['b'], 'b.png', { type: 'image/png' })]
    expect(buildJobPostFormData(values(), files).getAll('photos[]')).toHaveLength(2)
  })
})

describe('buildJobPostPayload', () => {
  it('clears emptied optional fields with null and keeps only the budget numbers the type uses', () => {
    const payload = buildJobPostPayload(values({ barangay: '', preferredDate: '', budgetType: 'fixed', budgetMin: '700', budgetMax: '900' }))

    expect(payload).toMatchObject({ title: 'Clean two rooms', tasks: ['Sweep', 'Mop'], barangay: null, preferredDate: null, budgetMin: '700', budgetMax: null })
    expect(buildJobPostPayload(values({ budgetType: 'open', budgetMin: '700' })).budgetMin).toBeNull()
    expect(buildJobPostPayload(values({ budgetType: 'range', budgetMin: '700', budgetMax: '900' })).budgetMax).toBe('900')
  })
})

describe('groupFieldErrors', () => {
  it('folds per-row errors into their field and keeps the first message', () => {
    expect(groupFieldErrors({ 'tasks.0': 'Too long', 'tasks.2': 'Required', 'title': 'Missing' })).toEqual({ tasks: 'Too long', title: 'Missing' })
  })
})
