import type { AuthUser } from '#shared/types/auth'
import { registerEndpoint } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSession } from './useSession'

const FAKE_USER: AuthUser = {
  id: '1',
  name: 'Amara Chen',
  email: 'amara@example.com',
  avatarUrl: null,
  isProvider: false,
  emailVerified: true,
}

// Matches the LocationPicker.test.ts convention: `registerEndpoint` spins up
// a real mock Nitro handler `$fetch` actually hits, unlike stubbing the
// global (auto-imports resolve to a fixed binding at transform time, so a
// global stub never reaches the code under test).
let loginUser: AuthUser = FAKE_USER
registerEndpoint('/api/auth/login', () => loginUser)
registerEndpoint('/api/auth/register', () => FAKE_USER)
registerEndpoint('/api/auth/logout', () => ({ message: 'Logged out.' }))
const meMock = vi.fn(() => null as AuthUser | null)
registerEndpoint('/api/auth/me', () => meMock())

describe('useSession', () => {
  // `activeRole` persists via `useLocalStorage`, not `useState` — reset it
  // between tests so one test's `setActiveRole()` can't leak into the next.
  beforeEach(() => {
    localStorage.clear()
    loginUser = FAKE_USER
    useCookie('pf_role').value = 'consumer'
    useState('active-role').value = 'consumer'
    meMock.mockReturnValue(null)
    // `useState('session', ...)` is shared across every `it()` in this file
    // (same Nuxt app instance) — reset it so one test's login() can't leak
    // into the next.
    useSession().clearLocal()
  })

  it('starts logged out, on the consumer role, with no name', () => {
    const session = useSession()

    expect(session.isAuthenticated.value).toBe(false)
    expect(session.name.value).toBe('')
    expect(session.initials.value).toBe('')
    expect(session.activeRole.value).toBe('consumer')
  })

  it('login() authenticates with the real endpoint and derives initials from the name', async () => {
    const session = useSession()

    await session.login('amara@example.com', 'password123')

    expect(session.isAuthenticated.value).toBe(true)
    expect(session.name.value).toBe('Amara Chen')
    expect(session.initials.value).toBe('AC')
  })

  it('register() authenticates with the returned user', async () => {
    const session = useSession()

    await session.register('Amara Chen', 'amara@example.com', 'password123', true)

    expect(session.isAuthenticated.value).toBe(true)
    expect(session.name.value).toBe('Amara Chen')
  })

  it('fetchUser() hydrates from /api/auth/me, including the logged-out (null) case', async () => {
    const session = useSession()

    await session.fetchUser()

    expect(session.isAuthenticated.value).toBe(false)
    expect(session.status.value).toBe('ready')
  })

  it('fetchUser() reflects an already-authenticated session', async () => {
    meMock.mockReturnValue(FAKE_USER)
    const session = useSession()

    await session.fetchUser()

    expect(session.isAuthenticated.value).toBe(true)
    expect(session.name.value).toBe('Amara Chen')
  })

  it('setActiveRole() switches a provider between roles without logging out', async () => {
    loginUser = { ...FAKE_USER, isProvider: true }
    const session = useSession()

    await session.login('amara@example.com', 'password123')
    session.setActiveRole('provider')

    expect(session.activeRole.value).toBe('provider')
    expect(session.isAuthenticated.value).toBe(true)
  })

  it('a user without a provider profile can never be in the provider role', async () => {
    const session = useSession()

    await session.login('amara@example.com', 'password123')
    session.setActiveRole('provider')

    expect(session.activeRole.value).toBe('consumer')
  })

  it('logout() calls the real endpoint and de-authenticates', async () => {
    loginUser = { ...FAKE_USER, isProvider: true }
    const session = useSession()

    await session.login('amara@example.com', 'password123')
    session.setActiveRole('provider')
    await session.logout()

    expect(session.isAuthenticated.value).toBe(false)
    // Logged out, nobody is a provider — the stored preference is kept for next login.
    expect(session.activeRole.value).toBe('consumer')
  })

  it('clearLocal() de-authenticates without calling the network', async () => {
    const session = useSession()
    await session.login('amara@example.com', 'password123')

    session.clearLocal()

    expect(session.isAuthenticated.value).toBe(false)
  })

  it('persists the active role across separate useSession() calls (survives a reload)', async () => {
    loginUser = { ...FAKE_USER, isProvider: true }
    await useSession().login('amara@example.com', 'password123')
    useSession().setActiveRole('provider')

    expect(useSession().activeRole.value).toBe('provider')
    // The preference lives in a cookie so SSR can read it on the next request.
    await nextTick()
    expect(document.cookie).toContain('pf_role=provider')
  })

  it('shares state across separate calls (single source of truth)', async () => {
    const a = useSession()
    const b = useSession()

    await a.login('amara@example.com', 'password123')
    expect(b.isAuthenticated.value).toBe(true)
    expect(b.name.value).toBe('Amara Chen')
  })
})
