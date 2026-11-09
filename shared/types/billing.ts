/**
 * Paid verification levels ("Billing"): the shapes of Laravel's `/dashboard/billing/**` and `/dashboard/kyc` answers
 * (camelCase). Names, labels and plan lengths come from the admin, so they are plain strings, not i18n keys.
 */

/** A verification badge on show on a provider's public profile ("Verified identity"). */
export interface VerificationBadge {
  slug: string
  label: string
}

/** A phone number our team called and confirmed, shown on the public profile. */
export interface VerifiedContact {
  label: string
  value: string
}

/** What a requirement asks for: an ID (front + back + number), a photo, a document (image or PDF) or a typed value. */
export type RequirementKind = 'id_document' | 'photo' | 'document' | 'phone' | 'text'

export type RequirementStatus = 'not_started' | 'in_review' | 'verified' | 'rejected'

export interface VerificationRequirement {
  /** Also the KYC step id: `POST /dashboard/kyc/{key}`. */
  key: string
  label: string
  description: string | null
  kind: RequirementKind
  status: RequirementStatus
  /** The typed answer (phone, text kinds). */
  value: string | null
  rejectionReason: string | null
  reviewedAt: string | null
}

export type PlanDurationUnit = 'day' | 'month' | 'year'

export interface VerificationPlan {
  id: number
  name: string
  durationCount: number
  durationUnit: PlanDurationUnit
  /** Ready to show: "365 days", "1 year". */
  durationLabel: string
  price: number
  isRecurring: boolean
}

export type SubscriptionState = 'active' | 'expired' | 'cancelled'
/** `grandfathered`: verified under the old free KYC, given a free year. `admin`: granted by an admin. */
export type SubscriptionSource = 'purchase' | 'grandfathered' | 'admin'

export interface VerificationSubscription {
  state: SubscriptionState
  source: SubscriptionSource
  startsAt: string | null
  endsAt: string | null
  autoRenew: boolean
  planName: string | null
  planIsRecurring: boolean
}

export type InvoiceStatus = 'unpaid' | 'pending_review' | 'paid' | 'cancelled'
export type InvoiceKind = 'new' | 'renewal'

export interface InvoiceSummary {
  /** "INV-000001" — also the invoice's address: `/billing/invoices/{number}`. */
  number: string
  kind: InvoiceKind
  status: InvoiceStatus
  isOverdue: boolean
  levelName: string
  planName: string
  durationLabel: string
  currency: string
  amount: number
  dueAt: string | null
  paidAt: string | null
  paymentMethodName: string | null
  createdAt: string | null
}

export interface PaymentGatewayOption {
  key: string
  driver: 'paypal' | 'manual'
  name: string
  description: string | null
  /** Bank details for a manual gateway: plain text with line breaks. */
  instructions: string | null
}

export interface BillingTransaction {
  id: number
  invoiceNumber: string | null
  levelName: string | null
  methodName: string | null
  reference: string | null
  currency: string
  amount: number
  status: 'completed'
  paidAt: string | null
}

export interface Invoice extends InvoiceSummary {
  paymentMethod: string | null
  paymentInstructions: string | null
  paymentReference: string | null
  hasProof: boolean
  paymentSubmittedAt: string | null
  /** Why a reported payment was sent back (the invoice is unpaid again). */
  reviewNote: string | null
  periodStartsAt: string | null
  periodEndsAt: string | null
  cancelledAt: string | null
  /** PayPal took the payment and is still reviewing it: nothing else can pay or cancel the invoice meanwhile. */
  paypalPending?: boolean
  canPay: boolean
  canCancel: boolean
  billedTo: { name: string | null, email: string | null }
  transactions: BillingTransaction[]
  /** How it can be paid; empty unless unpaid. */
  gateways: PaymentGatewayOption[]
}

export interface BasicCheck {
  key: string
  label: string
  done: boolean
}

export interface VerificationLevel {
  id: number
  slug: string
  name: string
  badgeLabel: string | null
  description: string | null
  inclusions: string[]
  isFree: boolean
  /** False for a level taken off sale that this provider still holds (it then has no plans). */
  isOnSale: boolean
  plans: VerificationPlan[]
  subscription: VerificationSubscription | null
  /** Paid for and every requirement approved: the badge is on the public profile. */
  badgeActive: boolean
  /** The provider holds this level, so its documents can be sent. */
  canUpload: boolean
  openInvoice: InvoiceSummary | null
  requirements: VerificationRequirement[]
  /** Level 1 only: what the free level checks on the profile itself. */
  basicChecks: BasicCheck[]
}

export interface BillingOverview {
  levels: VerificationLevel[]
  badges: VerificationBadge[]
  gateways: PaymentGatewayOption[]
  /** Renewal invoices are sent this many days before a level runs out. */
  renewalDaysBefore: number
  counts: { unpaid: number }
}

export type InvoiceFilter = 'all' | 'unpaid' | 'paid'

export interface InvoiceListMeta {
  page: number
  perPage: number
  total: number
  hasMore: boolean
  counts: { all: number, paid: number, unpaid: number, cancelled: number }
}
