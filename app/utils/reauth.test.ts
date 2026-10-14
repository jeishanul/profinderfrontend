import { describe, expect, it } from 'vitest'
import { reauthBody } from './reauth'

describe('reauthBody', () => {
  it('sends the password under the endpoint\'s field name', () => {
    expect(reauthBody(true, 'secret')).toEqual({ currentPassword: 'secret' })
    expect(reauthBody(true, 'secret', 'password')).toEqual({ password: 'secret' })
  })

  it('sends the emailed code for an account with no password', () => {
    expect(reauthBody(false, '123456')).toEqual({ verificationCode: '123456' })
    expect(reauthBody(false, '123456', 'password')).toEqual({ verificationCode: '123456' })
  })
})
