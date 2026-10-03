/**
 * Display copy for all of these lives in i18n messages under `dashboard.*`
 * (see CLAUDE.md — Internationalization) — only proper nouns (`clientName`,
 * `providerName`) are plain strings here. `categoryId` reuses the same ids
 * as `ServiceCategory` in `marketplace.ts` (`marketplace.categories.<id>.label`).
 */
import type { Review } from './marketplace'

export type UserRole = 'provider' | 'consumer'

export type KycStepId = 'identity' | 'selfie' | 'address'
export type KycStepStatus = 'verified' | 'in_review' | 'not_started' | 'rejected'

export interface KycStep {
  id: KycStepId
  status: KycStepStatus
  /** Why a `rejected` step was rejected — shown so the provider knows what to fix. */
  rejectionReason?: string | null
}

export interface KycState {
  steps: KycStep[]
  isVerified: boolean
}

export type BookingStatus = 'completed' | 'upcoming' | 'in_progress' | 'cancelled'
export type PaymentStatus = 'unpaid' | 'paid_cash' | 'refunded'

/** What the signed-in user may do to a booking right now — computed by the
 * server (the booking state machine), so the UI shows exactly the buttons
 * the API would accept instead of re-deriving the rules. */
export interface BookingAbilities {
  start: boolean
  complete: boolean
  cancel: boolean
  markPaid: boolean
  review: boolean
}

/** Fields every Purchases / Clients-served row carries. */
interface BookingRowBase {
  id: string
  /** Calendar date only; `scheduledAt` has the time. */
  date: string
  scheduledAt: string
  amountUsd: number
  status: BookingStatus
  paymentStatus: PaymentStatus
  /** Null when the booking's category was removed. */
  categoryId: string | null
  /** The category's current name, so an admin rename shows up everywhere. */
  categoryName: string | null
  serviceTitle: string | null
  conversationId: string | null
  hasReview: boolean
  /** The review can still be revised (within the edit window) by the viewer. */
  reviewEditable: boolean
  rating: number | null
  can: BookingAbilities
}

export interface BookingDetail {
  id: string
  status: BookingStatus
  paymentStatus: PaymentStatus
  scheduledAt: string
  hours: number | null
  amountUsd: number
  address: string | null
  notes: string | null
  categoryId: string | null
  categoryName: string | null
  service: { id: string, title: string } | null
  consumer: { id: string, name: string, avatarUrl: string | null }
  provider: { id: string, name: string, avatarUrl: string | null }
  conversationId: string | null
  quoteId: string | null
  startedAt: string | null
  completedAt: string | null
  cancelledAt: string | null
  cancelledBy: 'consumer' | 'provider' | 'admin' | null
  cancellationReason: string | null
  paidAt: string | null
  review: {
    id: string
    rating: number
    comment: string | null
    editable: boolean
    /** The provider's public answer, once given. */
    providerReply: string | null
    /** The viewer is the reviewed provider and hasn't answered yet. */
    canReply: boolean
  } | null
  viewerRole: 'consumer' | 'provider'
  /** ISO instant the provider's "Start" unlocks; only set for the provider of an upcoming job. */
  startAvailableAt: string | null
  can: BookingAbilities
}

export interface ClientServed extends BookingRowBase {
  /** The client's real user id — lets "Message" find-or-create a real
   * conversation instead of guessing by name. */
  clientUserId: string
  clientName: string
  repeatClient: boolean
}

export interface PurchaseRecord extends BookingRowBase {
  /** The provider's real provider-profile id — lets "Message" find-or-create
   * a real conversation instead of guessing by name. */
  providerId: string
  providerName: string
}

export interface ProviderKpis {
  activeGigs: number
  jobsCompletedThisMonth: number
  jobsCompletedChangePercent: number
  clientsServed: number
  repeatClients: number
  averageRating: number
  reviewCount: number
}

export interface ConsumerKpis {
  activeOrders: number
  ordersInProgress: number
  totalOrders: number
  providersHired: number
  providersHiredTwice: number
  savedProviders: number
  savedProvidersAvailableNow: number
}

export type ActivityKind
  = | 'new_booking'
    | 'payment_received'
    | 'review_received'
    | 'new_message'
    | 'order_completed'
    | 'refund_processed'
    | 'new_order'

export interface ActivityItem {
  id: string
  kind: ActivityKind
  personName: string
  categoryId: string
  amountUsd?: number
  ratingGiven?: number
  timeAgoHours: number
  link?: string | null
}

export interface DashboardSummary {
  role: UserRole
  providerKpis: ProviderKpis
  consumerKpis: ConsumerKpis
  activity: ActivityItem[]
  kyc: KycState
}

export interface RecentWorkPhoto {
  id: string
  url: string
}

export interface ProviderProfileDetail {
  id: string
  fullName: string
  headline: string | null
  bio: string | null
  phone: string | null
  email: string
  /** Real, uploaded server-hosted images now — `null` until the provider
   * picks one. */
  photoUrl: string | null
  coverPhotoUrl: string | null
  recentWorkPhotos: RecentWorkPhoto[]
  /** Province/city are PH location codes (see `server/utils/phLocations.ts`);
   * barangay is stored by name, matching `UiLocationPicker`'s own model. */
  provinceCode: string | null
  cityCode: string | null
  barangay: string | null
  address: string | null
  categoryId: string | null
  skillIds: string[]
  yearsExperience: number
  hourlyRateUsd: number
  minVisitFeeUsd: number | null
  responseTimeHours: number
  serviceAreaKm: number | null
  availableDays: string[]
  memberSince: string
  // Read-only, system-computed from real completed bookings/reviews — never
  // provider-editable (see `pages/profile.vue`'s "Rate & availability" vs
  // stats-summary split).
  averageRating: number
  reviewCount: number
  clientsServed: number
  reviews: Review[]
  ratingBreakdown: { stars: number, count: number }[]
  reviewsTotal: number
}

export type ConversationRole = 'client' | 'provider'

export type MessageStatus = 'sent' | 'delivered' | 'seen'

export type AttachmentType = 'image' | 'video' | 'document'

export interface MessageAttachment {
  type: AttachmentType
  name: string
  /** Present for stored files (streamed through the BFF) and for a `blob:` URL
   * on anything the person just attached locally. */
  url?: string
  sizeLabel?: string
}

export type QuoteStatus = 'pending' | 'accepted' | 'declined' | 'withdrawn' | 'expired'

/** A structured price a provider sends in-chat (e.g. "$50 for 3 hours, +$10/hr
 * for extra work") — see `DashboardQuoteFormModal`/`DashboardQuoteCard`.
 * Accepting one creates a booking server-side (`/dashboard/quotes/{id}/accept`). */
export interface Quote {
  id: string
  basePriceUsd: number
  baseHours: number
  extraHourlyRateUsd: number
  note?: string
  status: QuoteStatus
  /** ISO instant the job is proposed for — becomes the booking's date on acceptance. */
  scheduledAt?: string | null
  address?: string | null
  /** After this instant a pending quote can no longer be accepted. */
  expiresAt?: string | null
  serviceListingId?: string | null
  serviceTitle?: string | null
  /** Set once accepted — the booking this quote created. */
  bookingId?: string | null
}

/** What the quote form sends (create and edit use the same shape). */
export interface QuotePayload {
  basePriceUsd: number
  baseHours: number
  extraHourlyRateUsd: number
  note: string
  /** ISO instant. */
  scheduledAt: string
  address: string
  serviceListingId: string | null
  /** `null` while editing = keep the quote's current expiry. */
  expiresInHours: number | null
}

/** Structured, non-text content a message can carry. */
export interface MessageMeta {
  type: 'job_request' | 'booking_created' | 'quote_declined' | 'admin_notice'
  // job_request
  serviceListingId?: string | null
  serviceTitle?: string | null
  preferredDate?: string | null
  preferredTime?: string | null
  address?: string | null
  // booking_created
  bookingId?: string
  scheduledAt?: string
  // quote_declined
  quoteId?: string
  reason?: string
}

export interface ConversationMessage {
  id: string
  fromMe: boolean
  text: string
  /** Only meaningful for `fromMe` messages — the other side's messages are
   * always effectively "seen" by the time we render them. */
  status?: MessageStatus
  attachment?: MessageAttachment
  /** ISO instant the message was sent. */
  createdAt?: string
  /** Present when this message is a structured price quote rather than a
   * plain text/attachment message — see `Quote`. */
  quote?: Quote
  /** Job requests and system notices ("booking confirmed") — see `MessageMeta`. */
  meta?: MessageMeta | null
  /** The sender removed it — the row stays (so the thread's shape doesn't shift for the other
   * party), but `text`/`attachment`/`quote`/`meta` are all empty; render a placeholder instead. */
  deleted?: boolean
}

export interface Conversation {
  id: string
  personName: string
  role: ConversationRole
  categoryId: string
  categoryName?: string | null
  /** Text of the newest message; empty for quotes/attachments/system notices (see `lastMessageType`). */
  lastMessagePreview: string
  lastMessageType: 'none' | 'text' | 'job_request' | 'quote' | 'attachment' | 'system'
  timeAgoHours: number
  unread: boolean
  unreadCount: number
  archived: boolean
  /** The other person deleted their account: the history stays, but nothing can be sent. */
  otherDeleted?: boolean
  /** ISO instant of the other person's last login — the only "last seen" signal there is. */
  lastSeenAt: string | null
  /** Only present when a single thread was loaded (opening it, or starting it); the inbox list omits it. */
  messages?: ConversationMessage[]
  /** Older messages exist beyond the page in `messages`. */
  hasMoreBefore?: boolean
  /** The provider profile id this conversation is with (the thread's other side
   * when you are the client); links to `/providers/{id}`. */
  providerId?: string
}

export type NotificationTopic = 'bookings' | 'payments' | 'messages' | 'account' | 'system'

export type NotificationKind
  = | 'new_booking'
    | 'payment_received'
    | 'new_message'
    | 'job_request'
    | 'review_received'
    | 'order_completed'
    | 'refund_processed'
    | 'booking_reminder'
    | 'quote_received'
    | 'quote_declined'
    | 'booking_started'
    | 'booking_cancelled'
    | 'kyc_approved'
    | 'kyc_rejected'
    | 'provider_verified'
    | 'provider_unverified'
    | 'account_suspended'
    | 'account_reactivated'
    | 'review_hidden'
    | 'announcement'
    | 'admin_notice'
    | 'booking_updated'
    | 'listing_paused'
    | 'listing_removed'
    | 'provider_profile_removed'
    | 'provider_profile_restored'
    | 'report_resolved'
    | 'report_dismissed'

export interface NotificationItem {
  id: string
  kind: NotificationKind
  topic: NotificationTopic
  personName?: string
  categoryId?: string
  amountUsd?: number
  ratingGiven?: number
  /** Free text — only set for kinds that carry their own copy (admin announcements). */
  title?: string | null
  body?: string | null
  /** In-app path to open when the row is clicked (e.g. `/purchases?booking=12`). */
  link?: string | null
  timeAgoHours: number
  read: boolean
}

export type ServiceStatus = 'active' | 'paused'
export type ServicePriceType = 'flat' | 'hourly'

export interface ServiceListing {
  id: string
  title: string
  categoryId: string
  description: string
  durationLabel: string
  /** The category's current name (null for a listing with no category). */
  categoryName: string | null
  priceType: ServicePriceType
  priceAmount: number
  bookingsCount: number
  rating: number
  status: ServiceStatus
}

export interface SavedProvider {
  id: string
  name: string
  categoryId: string
  categoryName: string | null
  rating: number
  reviewCount: number
  hourlyRateUsd: number
  avatarUrl: string | null
  /** ISO timestamp of the last booking with them, `null` if never booked. */
  lastBookedAt: string | null
  verified: boolean
}

export interface NotificationPreferences {
  bookingRequests: boolean
  messages: boolean
  marketing: boolean
}

export interface AccountSettings {
  fullName: string
  email: string
  phone: string | null
  twoFactorEnabled: boolean
  passwordChangedLabel: string
  notificationPreferences: NotificationPreferences
  language: string
}

/** Paging info on every account-area list (`?page=&perPage=`). */
export interface ListPageMeta {
  page: number
  perPage: number
  total: number
  hasMore: boolean
}

export interface Paged<T, M extends ListPageMeta = ListPageMeta> {
  data: T[]
  meta: M
}

/** Status chip counts over the whole (search-filtered) list, not just the loaded page. */
export interface BookingListCounts {
  all: number
  upcoming: number
  in_progress: number
  completed: number
  cancelled: number
  to_review: number
}

export interface PurchaseListMeta extends ListPageMeta {
  counts: BookingListCounts
  totals: { providersHired: number, active: number }
}

/** Headline numbers over every listing of the provider, not just the loaded page. */
export interface ServiceListMeta extends ListPageMeta {
  totals: { active: number, bookings: number, averageRating: number | null }
}

export interface ClientListMeta extends ListPageMeta {
  counts: BookingListCounts
  totals: { clientsServed: number, repeatClients: number, earned: number }
}
