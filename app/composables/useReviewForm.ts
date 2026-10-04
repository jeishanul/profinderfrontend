export interface ReviewFormTarget {
  bookingId: string
  providerName: string
  /** Set when editing an existing review. */
  review?: { id: string, rating: number, comment: string | null } | null
}

/**
 * Opens the review form (mounted once in the dashboard layout) for a
 * completed booking — from the purchases list, the booking drawer, or a
 * "leave a review" shortcut — so they all share one form and one refresh path.
 */
export function useReviewForm() {
  const target = useState<ReviewFormTarget | null>('review-form-target', () => null)

  return {
    target: computed(() => target.value),
    open: (next: ReviewFormTarget) => {
      target.value = next
    },
    close: () => {
      target.value = null
    },
  }
}
