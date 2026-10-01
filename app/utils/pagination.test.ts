import { describe, expect, it } from 'vitest'
import { appendUnique, pageNumbers } from './pagination'

describe('pageNumbers', () => {
  it('shows every page when there are few', () => {
    expect(pageNumbers(1, 1)).toEqual([1])
    expect(pageNumbers(2, 4)).toEqual([1, 2, 3, 4])
  })

  it('keeps the ends and a window, with gaps marked null', () => {
    expect(pageNumbers(9, 20)).toEqual([1, null, 8, 9, 10, null, 20])
  })

  it('does not leave a gap for a single skipped page', () => {
    expect(pageNumbers(4, 10)).toEqual([1, 2, 3, 4, 5, null, 10])
  })

  it('stays inside the range near the ends', () => {
    expect(pageNumbers(1, 20)).toEqual([1, 2, null, 20])
    expect(pageNumbers(20, 20)).toEqual([1, null, 19, 20])
  })
})

describe('appendUnique', () => {
  it('appends new rows in order', () => {
    expect(appendUnique([{ id: 'a' }], [{ id: 'b' }, { id: 'c' }])).toEqual([{ id: 'a' }, { id: 'b' }, { id: 'c' }])
  })

  it('skips rows already shown (a new row shifted the page boundary)', () => {
    expect(appendUnique([{ id: 'a' }, { id: 'b' }], [{ id: 'b' }, { id: 'c' }])).toEqual([{ id: 'a' }, { id: 'b' }, { id: 'c' }])
  })
})
