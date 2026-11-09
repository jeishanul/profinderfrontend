import type { InvoiceSummary, VerificationLevel, VerificationRequirement } from '#shared/types/billing'

/** Where the provider stands with a level, for its status line. `date` is the ISO end (or expiry) date when known. */
export type LevelStatusKey = 'free' | 'notPurchased' | 'active' | 'grandfathered' | 'admin' | 'expired' | 'cancelled'

export function levelStatus(level: Pick<VerificationLevel, 'isFree' | 'subscription'>): { key: LevelStatusKey, date: string | null } {
  if (level.isFree) return { key: 'free', date: null }
  const subscription = level.subscription
  if (!subscription) return { key: 'notPurchased', date: null }
  const date = subscription.endsAt
  if (subscription.state === 'expired') return { key: 'expired', date }
  if (subscription.state === 'cancelled') return { key: 'cancelled', date }
  if (subscription.source === 'grandfathered') return { key: 'grandfathered', date }
  if (subscription.source === 'admin') return { key: 'admin', date }
  return { key: 'active', date }
}

/** How many of a level's requirements an admin has approved. */
export function requirementProgress(requirements: Pick<VerificationRequirement, 'status'>[]): { approved: number, total: number } {
  return {
    approved: requirements.filter(requirement => requirement.status === 'verified').length,
    total: requirements.length,
  }
}

/**
 * The badge of a paid level: on the profile, or held but still waiting for documents to be approved. `none` for the
 * free level and for a level not held (never bought, expired or cancelled).
 */
export type BadgeState = 'onProfile' | 'waitingDocuments' | 'none'

export function badgeState(level: Pick<VerificationLevel, 'isFree' | 'badgeActive' | 'subscription' | 'requirements'>): BadgeState {
  if (level.isFree) return 'none'
  if (level.badgeActive) return 'onProfile'
  if (level.subscription?.state === 'active' && level.requirements.length > 0) return 'waitingDocuments'
  return 'none'
}

/** The plan picked by default: the one the provider holds (to renew it), else the first. */
export function defaultPlanId(level: Pick<VerificationLevel, 'plans' | 'subscription'>): number | null {
  const held = level.subscription?.planName
  const match = held ? level.plans.find(plan => plan.name === held) : undefined
  return (match ?? level.plans[0])?.id ?? null
}

/** One status per invoice row: an unpaid invoice past its due date reads "Overdue". */
export type InvoiceStatusKey = 'paid' | 'pendingReview' | 'overdue' | 'unpaid' | 'cancelled'

export function invoiceStatusKey(invoice: Pick<InvoiceSummary, 'status' | 'isOverdue'>): InvoiceStatusKey {
  switch (invoice.status) {
    case 'paid': return 'paid'
    case 'cancelled': return 'cancelled'
    case 'pending_review': return 'pendingReview'
    default: return invoice.isOverdue ? 'overdue' : 'unpaid'
  }
}

export interface KycSection {
  level: VerificationLevel
  requirements: VerificationRequirement[]
}

/**
 * The Verification tab, grouped by paid level. Levels may share a requirement (the same ID for two levels); it is
 * listed once, under the first level the provider holds that asks for it (where it can be uploaded), else under the
 * first level that asks for it. Levels with nothing left to show are dropped.
 */
export function kycSections(levels: VerificationLevel[]): KycSection[] {
  const paid = levels.filter(level => !level.isFree)
  const owner = new Map<string, number>()
  for (const level of paid) {
    for (const requirement of level.requirements) {
      const current = owner.get(requirement.key)
      const currentLevel = current === undefined ? undefined : paid.find(candidate => candidate.id === current)
      if (current === undefined || (!currentLevel?.canUpload && level.canUpload)) owner.set(requirement.key, level.id)
    }
  }
  return paid
    .map(level => ({ level, requirements: level.requirements.filter(requirement => owner.get(requirement.key) === level.id) }))
    .filter(section => section.requirements.length > 0)
}

/** Receipts for a bank transfer: what the server accepts (jpg/png/webp/avif/pdf, 10 MB). */
export const PROOF_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'application/pdf']
export const MAX_PROOF_BYTES = 10 * 1024 * 1024

export function proofProblem(file: Pick<File, 'type' | 'size'>): 'type' | 'size' | null {
  if (!PROOF_MIME_TYPES.includes(file.type)) return 'type'
  if (file.size > MAX_PROOF_BYTES) return 'size'
  return null
}

/** The mobile numbers the server accepts for a `phone` requirement: digits, spaces, dashes, brackets, an optional +. */
export function isPlausiblePhone(value: string): boolean {
  return /^\+?[0-9 ()-]{7,20}$/.test(value.trim())
}
