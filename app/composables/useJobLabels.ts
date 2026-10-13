import type { JobBudget, JobPreferredTime } from '#shared/types/jobPosts'

/** The wording for the bits of a job post that appear on every Seek Job screen, so each screen says them the same way. */
export function useJobLabels() {
  const { t, locale } = useI18n()
  const { money } = useSiteSettings()

  function budgetLabel(budget: JobBudget): string {
    if (budget.type === 'fixed' && budget.min !== null) return t('seekJob.budget.fixed', { amount: money(budget.min) })
    if (budget.type === 'range' && budget.min !== null && budget.max !== null) {
      return t('seekJob.budget.range', { min: money(budget.min), max: money(budget.max) })
    }
    return t('seekJob.budget.open')
  }

  const timeLabel = (time: JobPreferredTime) => t(`seekJob.time.${time}`)
  /** A calendar date (`YYYY-MM-DD`) or an instant, as the viewer's locale writes it. */
  const dateLabel = (value: string) => formatDate(value, locale.value)
  const relativeLabel = (value: string) => formatRelativeDate(value, locale.value)

  /** "Quezon City, Metro Manila", skipping whatever isn't set. */
  const placeLabel = (post: { barangay: string | null, cityName: string | null, provinceName: string | null }) =>
    [post.barangay, post.cityName, post.provinceName].filter(Boolean).join(', ')

  return { budgetLabel, timeLabel, dateLabel, relativeLabel, placeLabel }
}
