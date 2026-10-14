import type { ListPageMeta } from './dashboard'

// Seek Job: consumers post a job, providers apply with an offer, the consumer hires one. These mirror what
// `JobPostPresenter` / `JobApplicationPresenter` return from the API.

export type JobPostStatus = 'open' | 'hired' | 'completed' | 'closed' | 'removed'
export type JobPostClosedReason = 'by_consumer' | 'expired' | 'booking_cancelled' | 'by_admin'
export type JobPreferredTime = 'morning' | 'afternoon' | 'evening' | 'flexible'
export type JobBudgetType = 'open' | 'fixed' | 'range'
export type JobApplicationStatus = 'pending' | 'hired' | 'not_selected' | 'declined' | 'withdrawn'

export interface JobBudget {
  type: JobBudgetType
  min: number | null
  max: number | null
}

export interface JobPostPhoto {
  id: string
  /** An authorised route (the files are private); false once the file was cleared out long after the post ended. */
  url: string
  available: boolean
}

/** What every viewer sees of a post. The street address is never part of it. */
export interface JobPostBase {
  id: string
  title: string
  description: string
  tasks: string[]
  categoryId: string | null
  categoryName: string | null
  provinceCode: string | null
  provinceName: string | null
  cityCode: string | null
  cityName: string | null
  barangay: string | null
  /** `YYYY-MM-DD`. */
  preferredDate: string | null
  preferredTime: JobPreferredTime
  budget: JobBudget
  status: JobPostStatus
  closedReason: JobPostClosedReason | null
  applicationsCount: number
  expiresAt: string | null
  createdAt: string
  photos: JobPostPhoto[]
}

export interface JobApplicationCounts {
  pending: number
  hired: number
  notSelected: number
  declined: number
  withdrawn: number
}

/** A consumer's own post. */
export interface JobPost extends JobPostBase {
  /** Private: shared only with the provider who is hired, through the booking. */
  address: string | null
  newApplicationsCount: number
  lastEditedAt: string | null
  hiredApplicationId: string | null
  bookingId: string | null
  can: { edit: boolean, close: boolean, reopen: boolean, delete: boolean }
  /** Detail only. */
  applicationCounts?: JobApplicationCounts
  /** Detail only: someone applied, so the category and place can no longer change. */
  locked?: boolean
}

/** A post in a provider's feed or on its page. */
export interface JobPostForProvider extends JobPostBase {
  postedBy: { name: string, avatarUrl: string | null }
  applied: boolean
  myApplicationStatus: JobApplicationStatus | null
}

export interface JobApplicantProvider {
  id: string
  userId: string
  name: string
  avatarUrl: string | null
  headline: string | null
  verified: boolean
  rating: number
  reviewCount: number
  /** The number the list is sorted by (a rating that accounts for how many reviews back it). */
  score: number
  jobsCompleted: number
  cityName: string | null
  sameCity: boolean
  sameProvince: boolean
}

interface JobOfferFields {
  id: string
  status: JobApplicationStatus
  note: string
  offerPrice: number
  offerHours: number
  extraHourlyRate: number | null
  proposedAt: string
  offerUpdatedAt: string | null
  declineReason: string | null
  createdAt: string
}

/** One applicant, as the consumer who owns the post sees them. */
export interface JobApplicant extends JobOfferFields {
  isNew: boolean
  isTopMatch: boolean
  /** The offer was made before the post was last edited. */
  offerBeforeEdit: boolean
  conversationId: string | null
  provider: JobApplicantProvider
  can: { hire: boolean, decline: boolean, message: boolean }
}

/** The provider's own application, optionally with a summary of the post it is on. */
export interface JobApplicationMine extends JobOfferFields {
  postId: string
  conversationId: string | null
  /** Once hired: the booking to open next. */
  bookingId: string | null
  can: { edit: boolean, withdraw: boolean }
  post?: {
    id: string
    title: string
    status: JobPostStatus
    closedReason: JobPostClosedReason | null
    categoryName: string | null
    cityName: string | null
    preferredDate: string | null
    budget: JobBudget
    expiresAt: string | null
  }
}

export interface JobPostListMeta extends ListPageMeta {
  counts: { open: number, hired: number, completed: number, closed: number }
}

export interface JobApplicantListMeta extends ListPageMeta {
  counts: JobApplicationCounts
  sort: string
}

/** The values of the create/edit form (everything is a string or array, as the inputs hold them). */
export interface JobPostFormValues {
  title: string
  description: string
  tasks: string[]
  categoryId: string | null
  provinceCode: string | null
  cityCode: string | null
  barangay: string | null
  address: string
  preferredDate: string
  preferredTime: JobPreferredTime
  budgetType: JobBudgetType
  budgetMin: string
  budgetMax: string
}

/** The provider's own applications list: counts per status. */
export interface JobApplicationMineListMeta extends ListPageMeta {
  counts: Record<JobApplicationStatus, number>
}

/** What a provider sends to apply, or to change a pending offer. */
export interface JobOfferPayload {
  note: string
  offerPrice: number
  offerHours: number
  extraHourlyRate: number | null
  /** ISO instant. */
  proposedAt: string
}
