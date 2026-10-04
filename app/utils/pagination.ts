/**
 * Page numbers to show in a pager: always the first and last page and a window
 * around the current one, with `null` marking a gap ("…"). For 20 pages on
 * page 9: [1, null, 8, 9, 10, null, 20].
 */
export function pageNumbers(current: number, total: number, around = 1): (number | null)[] {
  if (total <= 1) return [1]

  const shown = new Set<number>([1, total])
  for (let page = current - around; page <= current + around; page++) {
    if (page >= 1 && page <= total) shown.add(page)
  }

  const sorted = [...shown].sort((a, b) => a - b)
  const result: (number | null)[] = []
  sorted.forEach((page, index) => {
    const previous = sorted[index - 1]
    if (previous !== undefined && page - previous === 2) result.push(previous + 1)
    else if (previous !== undefined && page - previous > 2) result.push(null)
    result.push(page)
  })
  return result
}

/** Appends a freshly loaded page to what is already shown, skipping rows that shifted across the page boundary. */
export function appendUnique<T extends { id: string }>(current: T[], next: T[]): T[] {
  const seen = new Set(current.map(item => item.id))
  return [...current, ...next.filter(item => !seen.has(item.id))]
}
