import { describe, expect, it } from 'vitest'
import type { VerificationLevel, VerificationRequirement, VerificationSubscription } from '#shared/types/billing'
import { badgeState, defaultPlanId, invoiceStatusKey, isPlausiblePhone, kycSections, levelStatus, proofProblem, requirementProgress } from './billing'

function subscription(overrides: Partial<VerificationSubscription> = {}): VerificationSubscription {
  return { state: 'active', source: 'purchase', startsAt: '2026-01-01T00:00:00Z', endsAt: '2027-01-01T00:00:00Z', autoRenew: true, planName: 'Yearly', planIsRecurring: true, ...overrides }
}

function requirement(key: string, status: VerificationRequirement['status'] = 'not_started'): VerificationRequirement {
  return { key, label: key, description: null, kind: 'photo', status, value: null, rejectionReason: null, reviewedAt: null }
}

function level(overrides: Partial<VerificationLevel> = {}): VerificationLevel {
  return {
    id: 2,
    slug: 'identity',
    name: 'Level 2',
    badgeLabel: 'Verified identity',
    description: null,
    inclusions: [],
    isFree: false,
    isOnSale: true,
    plans: [{ id: 10, name: 'Yearly', durationCount: 365, durationUnit: 'day', durationLabel: '365 days', price: 365, isRecurring: true }],
    subscription: null,
    badgeActive: false,
    canUpload: false,
    openInvoice: null,
    requirements: [],
    basicChecks: [],
    ...overrides,
  }
}

describe('levelStatus', () => {
  it('tells free, not bought, active, grandfathered, admin, expired and cancelled apart', () => {
    expect(levelStatus(level({ isFree: true })).key).toBe('free')
    expect(levelStatus(level()).key).toBe('notPurchased')
    expect(levelStatus(level({ subscription: subscription() }))).toEqual({ key: 'active', date: '2027-01-01T00:00:00Z' })
    expect(levelStatus(level({ subscription: subscription({ source: 'grandfathered' }) })).key).toBe('grandfathered')
    expect(levelStatus(level({ subscription: subscription({ source: 'admin' }) })).key).toBe('admin')
    expect(levelStatus(level({ subscription: subscription({ state: 'expired', source: 'grandfathered' }) })).key).toBe('expired')
    expect(levelStatus(level({ subscription: subscription({ state: 'cancelled' }) })).key).toBe('cancelled')
  })
})

describe('requirementProgress', () => {
  it('counts approved requirements', () => {
    expect(requirementProgress([requirement('a', 'verified'), requirement('b', 'in_review'), requirement('c')])).toEqual({ approved: 1, total: 3 })
  })
})

describe('badgeState', () => {
  it('is on the profile when the server says so', () => {
    expect(badgeState(level({ badgeActive: true, subscription: subscription() }))).toBe('onProfile')
  })
  it('waits for documents while held with requirements', () => {
    expect(badgeState(level({ subscription: subscription(), requirements: [requirement('a')] }))).toBe('waitingDocuments')
  })
  it('is none for the free level, a level not held or an expired one', () => {
    expect(badgeState(level({ isFree: true, badgeActive: true }))).toBe('none')
    expect(badgeState(level({ requirements: [requirement('a')] }))).toBe('none')
    expect(badgeState(level({ subscription: subscription({ state: 'expired' }), requirements: [requirement('a')] }))).toBe('none')
  })
})

describe('defaultPlanId', () => {
  it('prefers the held plan, else the first, else null', () => {
    const plans = [
      { id: 1, name: 'Monthly', durationCount: 1, durationUnit: 'month' as const, durationLabel: '1 month', price: 50, isRecurring: true },
      { id: 2, name: 'Yearly', durationCount: 1, durationUnit: 'year' as const, durationLabel: '1 year', price: 365, isRecurring: true },
    ]
    expect(defaultPlanId(level({ plans, subscription: subscription({ planName: 'Yearly' }) }))).toBe(2)
    expect(defaultPlanId(level({ plans }))).toBe(1)
    expect(defaultPlanId(level({ plans: [] }))).toBeNull()
  })
})

describe('invoiceStatusKey', () => {
  it('marks an unpaid invoice past its due date as overdue', () => {
    expect(invoiceStatusKey({ status: 'unpaid', isOverdue: true })).toBe('overdue')
    expect(invoiceStatusKey({ status: 'unpaid', isOverdue: false })).toBe('unpaid')
    expect(invoiceStatusKey({ status: 'pending_review', isOverdue: true })).toBe('pendingReview')
    expect(invoiceStatusKey({ status: 'paid', isOverdue: false })).toBe('paid')
    expect(invoiceStatusKey({ status: 'cancelled', isOverdue: false })).toBe('cancelled')
  })
})

describe('kycSections', () => {
  it('groups by paid level, listing a shared requirement once under the level that can upload it', () => {
    const free = level({ id: 1, isFree: true, canUpload: true })
    const identity = level({ id: 2, requirements: [requirement('identity'), requirement('selfie')] })
    const business = level({ id: 3, canUpload: true, subscription: subscription(), requirements: [requirement('identity'), requirement('permit')] })
    const sections = kycSections([free, identity, business])
    expect(sections.map(section => [section.level.id, section.requirements.map(r => r.key)])).toEqual([
      [2, ['selfie']],
      [3, ['identity', 'permit']],
    ])
  })
  it('keeps a shared requirement under the first level when none is held', () => {
    const a = level({ id: 2, requirements: [requirement('identity')] })
    const b = level({ id: 3, requirements: [requirement('identity'), requirement('permit')] })
    expect(kycSections([a, b]).map(section => section.requirements.map(r => r.key))).toEqual([['identity'], ['permit']])
  })
})

describe('proofProblem', () => {
  it('accepts images and PDFs up to 10 MB', () => {
    expect(proofProblem({ type: 'application/pdf', size: 1000 })).toBeNull()
    expect(proofProblem({ type: 'image/gif', size: 1000 })).toBe('type')
    expect(proofProblem({ type: 'image/png', size: 11 * 1024 * 1024 })).toBe('size')
  })
})

describe('isPlausiblePhone', () => {
  it('accepts what the server accepts', () => {
    expect(isPlausiblePhone('+63 912 345 6789')).toBe(true)
    expect(isPlausiblePhone('(02) 8123-4567')).toBe(true)
    expect(isPlausiblePhone('12345')).toBe(false)
    expect(isPlausiblePhone('call me')).toBe(false)
  })
})
