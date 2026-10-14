import { describe, expect, it } from 'vitest'
import { isDeletable, isReportable } from './messageActions'

const base = { deleted: false, fromMe: true, quote: null, meta: null } as never

describe('message actions', () => {
  it('lets you delete your own plain message', () => {
    expect(isDeletable({ ...(base as object) } as never)).toBe(true)
    expect(isReportable({ ...(base as object) } as never)).toBe(false)
  })

  it('does not let you delete quotes, system notices or already-deleted messages', () => {
    expect(isDeletable({ ...(base as object), quote: { id: '1' } } as never)).toBe(false)
    expect(isDeletable({ ...(base as object), meta: { type: 'quote_declined' } } as never)).toBe(false)
    expect(isDeletable({ ...(base as object), deleted: true } as never)).toBe(false)
  })

  it('treats a job request as a normal message', () => {
    expect(isDeletable({ ...(base as object), meta: { type: 'job_request' } } as never)).toBe(true)
  })

  it('lets you report only the other person\'s plain messages', () => {
    expect(isReportable({ ...(base as object), fromMe: false } as never)).toBe(true)
    expect(isReportable({ ...(base as object), fromMe: false, meta: { type: 'booking_created' } } as never)).toBe(false)
    expect(isReportable({ ...(base as object), fromMe: false, deleted: true } as never)).toBe(false)
  })
})
