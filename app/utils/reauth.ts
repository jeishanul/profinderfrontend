/**
 * The body for an action that needs proof it's really the account owner. People with a password send it under the
 * endpoint's own field name (`currentPassword` for most, `password` for starting 2FA setup); accounts created by
 * social sign-in have no password and send the one-time code emailed to them instead.
 */
export function reauthBody(hasPassword: boolean, value: string, passwordField: 'currentPassword' | 'password' = 'currentPassword'): Record<string, string> {
  return hasPassword ? { [passwordField]: value } : { verificationCode: value }
}
