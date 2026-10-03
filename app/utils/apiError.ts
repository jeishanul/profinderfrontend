/**
 * The shape the browser actually sees. Our Nitro BFF re-throws Laravel's error body inside
 * `createError({ data })`, so the failed response is `{ statusCode, statusMessage, message, data: <Laravel body> }`
 * and Laravel's `errors` / `code` live one level deeper than `message`.
 */
interface LaravelErrorBody {
  message?: string
  code?: string
  errors?: Record<string, string[]>
}

interface ApiErrorShape {
  statusCode?: number
  status?: number
  data?: { message?: string, data?: LaravelErrorBody } & LaravelErrorBody
}

function laravelBody(error: unknown): LaravelErrorBody {
  const data = (error as ApiErrorShape | null)?.data
  // Prefer the wrapped Laravel body; fall back to a flat body (direct Laravel responses, older mocks).
  return data?.data ?? data ?? {}
}

/** Server-provided message when there is one (Laravel's `message`), else the caller's translated fallback. */
export function apiErrorMessage(error: unknown, fallback: string): string {
  const message = laravelBody(error).message ?? (error as ApiErrorShape | null)?.data?.message
  return typeof message === 'string' && message.length > 0 ? message : fallback
}

/** Laravel 422 `errors` collapsed to the first message per field, ready to bind to form inputs. */
export function apiFieldErrors(error: unknown): Record<string, string> {
  const errors = laravelBody(error).errors ?? {}
  return Object.fromEntries(
    Object.entries(errors)
      .filter(([, messages]) => Array.isArray(messages) && messages.length > 0)
      .map(([field, messages]) => [field, messages[0]!]),
  )
}

/** Machine-readable `code` Laravel attaches to some refusals (`email_unverified`, `account_deactivated`, …). */
export function apiErrorCode(error: unknown): string | undefined {
  const code = laravelBody(error).code
  return typeof code === 'string' ? code : undefined
}

export function apiErrorStatus(error: unknown): number | undefined {
  const e = error as ApiErrorShape | null
  return e?.statusCode ?? e?.status
}
