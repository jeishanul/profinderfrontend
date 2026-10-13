/**
 * The message for a failed Seek Job request. The API refuses with a machine-readable `code`; each one has its own
 * wording, in `seekJob.errors.<code>` (consumer side) or `findJobs.errors.<code>` (provider side). Anything else falls
 * back to the server's message, then to a generic line.
 */
export function useJobErrors() {
  const { t, te } = useI18n()

  return (error: unknown, fallbackKey = 'seekJob.errors.generic'): string => {
    const code = apiErrorCode(error)
    for (const namespace of ['seekJob', 'findJobs']) {
      if (code && te(`${namespace}.errors.${code}`)) return t(`${namespace}.errors.${code}`)
    }
    return apiErrorMessage(error, t(fallbackKey))
  }
}
