/**
 * The landing-page path to look up for a redirect, or null when the request is not for a location landing page
 * (`/ph/<province>[/<city>[/<barangay>]]`). Lower-cased, without a trailing slash or query, as Laravel stores them.
 */
export function landingPath(requestPath: string): string | null {
  let path: string
  try {
    path = decodeURIComponent(requestPath.split('?')[0] ?? '')
  }
  catch {
    return null
  }
  path = path.toLowerCase().replace(/\/+$/, '')

  return /^\/ph\/[a-z0-9-]+(?:\/[a-z0-9-]+){0,2}$/.test(path) ? path : null
}
