import { describe, expect, it } from 'vitest'
import { useAuthModal } from './useAuthModal'

describe('useAuthModal', () => {
  it('starts closed on the login view with no reset email', () => {
    const modal = useAuthModal()

    expect(modal.isOpen.value).toBe(false)
    expect(modal.view.value).toBe('login')
    expect(modal.resetEmail.value).toBe('')
  })

  it('open() shows the modal on the requested view, defaulting to login', () => {
    const modal = useAuthModal()

    modal.open('register')
    expect(modal.isOpen.value).toBe(true)
    expect(modal.view.value).toBe('register')

    modal.close()
    modal.open()
    expect(modal.isOpen.value).toBe(true)
    expect(modal.view.value).toBe('login')
  })

  it('close() hides the modal without resetting its view', () => {
    const modal = useAuthModal()

    modal.open('register')
    modal.close()

    expect(modal.isOpen.value).toBe(false)
    expect(modal.view.value).toBe('register')
  })

  it('setView() switches views without affecting open state', () => {
    const modal = useAuthModal()

    modal.setView('forgot-password')
    expect(modal.view.value).toBe('forgot-password')
    expect(modal.isOpen.value).toBe(false)
  })

  it('walks the forgot-password → otp → reset-password flow', () => {
    const modal = useAuthModal()

    modal.open('login')
    modal.setView('forgot-password')
    modal.setResetEmail('user@example.com')
    modal.setView('otp')

    expect(modal.view.value).toBe('otp')
    expect(modal.resetEmail.value).toBe('user@example.com')

    modal.setView('reset-password')
    expect(modal.view.value).toBe('reset-password')
    expect(modal.resetEmail.value).toBe('user@example.com')
  })

  it('shares state across separate calls (single source of truth)', () => {
    const a = useAuthModal()
    const b = useAuthModal()

    a.open('register')
    expect(b.isOpen.value).toBe(true)
    expect(b.view.value).toBe('register')
  })

  it('remembers what the visitor was doing and runs it on complete()', async () => {
    const modal = useAuthModal()
    let ran = false

    modal.open('login', {
      onSuccess: () => {
        ran = true
      },
    })
    await modal.complete()

    expect(ran).toBe(true)
    expect(modal.isOpen.value).toBe(false)
  })

  it('complete() with nothing to resume just closes the modal', async () => {
    const modal = useAuthModal()

    modal.open('login')
    await modal.complete()

    expect(modal.isOpen.value).toBe(false)
  })
})
