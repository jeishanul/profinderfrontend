<script setup lang="ts">
// Auto-imported as <MarketplaceAuthModal />. Mounted once, site-wide, in
// `layouts/default.vue` — every "Log in" / "Sign up" / "Message" control
// anywhere in the app opens this same instance via `useAuthModal()`.
// Backed by the real Laravel API now (see `useSession` and
// `server/api/auth/*`) — login/register/forgot-password/otp/reset-password
// all call it. The social buttons are plain links into the Nitro OAuth
// redirect (`server/api/auth/social/*`); the callback lands back on `/` with a
// `?social=` result that `onMounted` below turns into a login or an error.
const { t } = useI18n()
const { settings } = useSiteSettings()
const siteName = computed(() => settings.value.siteName ?? t('brand.name'))
const authModal = useAuthModal()
const session = useSession()

const titleId = useId()

const toast = useToast()
const route = useRoute()

// Which providers have credentials configured — the others get no button.
const { data: socialProviders } = useFetch<{ google: boolean, facebook: boolean }>('/api/auth/social/providers', { default: () => ({ google: false, facebook: false }) })
const socialButtons = computed(() => (['google', 'facebook'] as const).filter(provider => socialProviders.value?.[provider]))

onMounted(async () => {
  const result = route.query.social
  if (typeof result !== 'string') return

  const challenge = typeof route.query.challenge === 'string' ? route.query.challenge : ''
  // Drop the result (and the 2FA challenge) from the address bar straight away.
  await navigateTo({ path: route.path, query: {}, hash: route.hash }, { replace: true })

  if (result === 'ok') {
    await session.fetchUser()
    await authModal.complete()
  }
  else if (result === '2fa' && challenge) {
    twoFactorChallengeToken.value = challenge
    twoFactorCode.value = ''
    twoFactorError.value = ''
    authModal.open('two-factor')
  }
  else if (result === 'error') {
    authModal.open('login')
    const reason = route.query.reason
    loginError.value = reason === 'cancelled'
      ? t('auth.social.cancelledError')
      : reason === 'account_suspended' || reason === 'account_banned'
        ? t('auth.login.suspendedError')
        : reason === 'account_deactivated'
          ? t('auth.social.deactivatedError')
          : reason === 'social_no_email'
            ? t('auth.social.noEmailError')
            : t('auth.social.failedError')
  }
})

const login = reactive({ identifier: '', password: '', remember: true })
const register = reactive({ fullName: '', email: '', password: '', confirmPassword: '', acceptTerms: false })
// Set when the account was paused by its owner: offer to bring it back instead of just failing.
const needsReactivation = ref(false)
const showLoginPassword = ref(false)
const showRegisterPassword = ref(false)
const loginError = ref('')
const registerError = ref('')
const loginLoading = ref(false)
const registerLoading = ref(false)

const tabButtonClass = (tab: 'login' | 'register') => [
  'rounded-full px-5 py-2.5 text-sm font-bold transition-colors',
  authModal.view.value === tab
    ? 'bg-brand-600 text-white'
    : 'text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white',
]
const isAuthTab = computed(() => authModal.view.value === 'login' || authModal.view.value === 'register')

// --- Forgot password → OTP → reset password -------------------------------

const forgotEmail = ref('')
const otpCode = ref('')
const resetPassword = reactive({ password: '', confirmPassword: '' })
const showResetPassword = ref(false)
const showResetConfirmPassword = ref(false)
const resetError = ref('')
const resetSuccess = ref(false)
const otpError = ref('')
const forgotPasswordLoading = ref(false)
const otpLoading = ref(false)
const resetPasswordLoading = ref(false)

const RESEND_SECONDS = 45
const countdown = useCountdown(RESEND_SECONDS)
const countdownLabel = computed(() => {
  const total = countdown.remaining.value
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
})

type BackStep = 'login' | 'forgot-password' | 'otp'
const backTarget = computed<BackStep | null>(() => {
  switch (authModal.view.value) {
    case 'forgot-password': return 'login'
    case 'otp': return 'forgot-password'
    // Going "back" from the success screen would re-open a code that's
    // already served its purpose — only offer it during the input step.
    case 'reset-password': return resetSuccess.value ? null : 'otp'
    case 'two-factor': return 'login'
    default: return null
  }
})

// --- 2FA login challenge — the second step when `session.login` reports
// `twoFactorRequired` instead of returning the user directly. -------------

const twoFactorChallengeToken = ref('')
const twoFactorCode = ref('')
const twoFactorError = ref('')
const twoFactorLoading = ref(false)

async function handleTwoFactorSubmit() {
  if (twoFactorCode.value.length < 6) return
  twoFactorLoading.value = true
  twoFactorError.value = ''
  try {
    await session.completeTwoFactorChallenge(twoFactorChallengeToken.value, twoFactorCode.value, login.remember)
    await authModal.complete()
  }
  catch {
    twoFactorError.value = t('auth.twoFactor.invalidError')
  }
  finally {
    twoFactorLoading.value = false
  }
}

function goBack() {
  if (backTarget.value) authModal.setView(backTarget.value)
}

function goToForgotPassword() {
  forgotEmail.value = login.identifier.includes('@') ? login.identifier : ''
  authModal.setView('forgot-password')
}

function goToChangeEmail() {
  forgotEmail.value = authModal.resetEmail.value
  authModal.setView('forgot-password')
}

async function requestOtp() {
  await useApiFetch('/api/auth/forgot-password', { method: 'POST', body: { email: forgotEmail.value } })
}

async function handleForgotPasswordSubmit() {
  forgotPasswordLoading.value = true
  resetError.value = ''
  try {
    await requestOtp()
    authModal.setResetEmail(forgotEmail.value)
    otpCode.value = ''
    authModal.setView('otp')
    countdown.start()
  }
  catch {
    // The endpoint never reveals whether the email exists — a thrown error
    // here means the request itself failed, not a wrong/unknown email.
    resetError.value = t('errors.somethingWrong')
  }
  finally {
    forgotPasswordLoading.value = false
  }
}

const resendLoading = ref(false)
async function handleResend() {
  if (countdown.isActive.value || resendLoading.value) return
  resendLoading.value = true
  otpCode.value = ''
  try {
    await requestOtp()
    countdown.start()
    toast.info(t('auth.otp.resent'))
  }
  catch (error) {
    toast.error(apiErrorMessage(error, t('errors.somethingWrong')))
  }
  finally {
    resendLoading.value = false
  }
}

async function handleOtpSubmit() {
  if (otpCode.value.length !== 6) return
  otpLoading.value = true
  otpError.value = ''
  try {
    await useApiFetch('/api/auth/verify-otp', { method: 'POST', body: { email: authModal.resetEmail.value, code: otpCode.value } })
    resetError.value = ''
    resetSuccess.value = false
    resetPassword.password = ''
    resetPassword.confirmPassword = ''
    authModal.setView('reset-password')
  }
  catch {
    otpError.value = t('auth.otp.invalidError')
  }
  finally {
    otpLoading.value = false
  }
}

async function handleResetPasswordSubmit() {
  if (resetPassword.password.length < 8) {
    resetError.value = t('auth.resetPassword.tooShortError')
    return
  }
  if (resetPassword.password !== resetPassword.confirmPassword) {
    resetError.value = t('auth.resetPassword.mismatchError')
    return
  }

  resetPasswordLoading.value = true
  try {
    await useApiFetch('/api/auth/reset-password', {
      method: 'POST',
      body: { email: authModal.resetEmail.value, code: otpCode.value, password: resetPassword.password },
    })
    resetError.value = ''
    resetSuccess.value = true
  }
  catch {
    resetError.value = t('errors.somethingWrong')
  }
  finally {
    resetPasswordLoading.value = false
  }
}

function continueToLogin() {
  resetSuccess.value = false
  authModal.setView('login')
}

async function handleLoginSubmit(reactivate = false) {
  loginLoading.value = true
  loginError.value = ''
  needsReactivation.value = false
  try {
    const result = await session.login(login.identifier, login.password, { remember: login.remember, reactivate })
    if ('twoFactorRequired' in result) {
      twoFactorChallengeToken.value = result.challengeToken
      twoFactorCode.value = ''
      twoFactorError.value = ''
      authModal.setView('two-factor')
      return
    }
    await authModal.complete()
  }
  catch (error) {
    // The server says *why* (suspended, paused by the owner, wrong password) — show that, not one vague line.
    const code = apiErrorCode(error)
    if (code === 'account_deactivated') {
      needsReactivation.value = true
      loginError.value = t('auth.login.deactivatedError')
    }
    else if (code === 'account_suspended' || code === 'account_banned') {
      loginError.value = t('auth.login.suspendedError')
    }
    else if (apiErrorStatus(error) === 429) {
      loginError.value = t('auth.login.tooManyAttempts')
    }
    else {
      loginError.value = t('auth.login.invalidError')
    }
  }
  finally {
    loginLoading.value = false
  }
}

async function handleRegisterSubmit() {
  registerError.value = ''
  if (!register.acceptTerms) {
    registerError.value = t('auth.register.termsRequiredError')
    return
  }
  if (register.password !== register.confirmPassword) {
    registerError.value = t('auth.register.passwordMismatchError')
    return
  }

  registerLoading.value = true
  try {
    await session.register(register.fullName, register.email, register.password, register.acceptTerms)
    // A code was just emailed; ask for it now (they can skip and do it later from the banner).
    verifyCode.value = ''
    verifyError.value = ''
    verifyCountdown.start()
    authModal.setView('verify-email')
  }
  catch (error) {
    registerError.value = Object.values(apiFieldErrors(error))[0] ?? t('auth.register.failedError')
  }
  finally {
    registerLoading.value = false
  }
}

// --- Verify email (after sign-up, or reopened from the dashboard banner) ------

// Opening this step from anywhere starts it clean, with the resend timer running
// (a code has just been emailed by whoever opened it).
watch(() => authModal.view.value, (view) => {
  if (view !== 'verify-email') return
  verifyCode.value = ''
  verifyError.value = ''
  if (!verifyCountdown.isActive.value) verifyCountdown.start()
})

const verifyCode = ref('')
const verifyError = ref('')
const verifyLoading = ref(false)
const verifyResendLoading = ref(false)
const verifyCountdown = useCountdown(RESEND_SECONDS)
const verifyCountdownLabel = computed(() => {
  const total = verifyCountdown.remaining.value
  return `${Math.floor(total / 60)}:${(total % 60).toString().padStart(2, '0')}`
})

async function handleVerifySubmit() {
  if (verifyCode.value.length !== 6) return
  verifyLoading.value = true
  verifyError.value = ''
  try {
    await useApiFetch('/api/auth/email/verify', { method: 'POST', body: { code: verifyCode.value } })
    await session.fetchUser()
    toast.success(t('auth.verifyEmail.verified'))
    await authModal.complete()
  }
  catch {
    verifyError.value = t('auth.otp.invalidError')
  }
  finally {
    verifyLoading.value = false
  }
}

async function handleVerifyResend() {
  if (verifyCountdown.isActive.value || verifyResendLoading.value) return
  verifyResendLoading.value = true
  try {
    await useApiFetch('/api/auth/email/send', { method: 'POST' })
    verifyCountdown.start()
    toast.info(t('auth.otp.resent'))
  }
  catch (error) {
    toast.error(apiErrorMessage(error, t('errors.somethingWrong')))
  }
  finally {
    verifyResendLoading.value = false
  }
}

async function skipVerification() {
  await authModal.complete()
}
</script>

<template>
  <UiModal
    :open="authModal.isOpen.value"
    :labelledby="titleId"
    @close="authModal.close()"
  >
    <button
      v-if="backTarget"
      type="button"
      class="absolute top-[18px] left-[18px] flex h-9 w-9 items-center justify-center rounded-full text-black/50 transition-colors hover:bg-black/5 hover:text-black dark:text-white/50 dark:hover:bg-white/10 dark:hover:text-white"
      :aria-label="t('auth.back')"
      @click="goBack"
    >
      <UiIcon
        name="arrow-right"
        :size="18"
        class="rotate-180"
      />
    </button>

    <button
      type="button"
      class="absolute top-[18px] right-[18px] flex h-9 w-9 items-center justify-center rounded-full text-black/50 transition-colors hover:bg-black/5 hover:text-black dark:text-white/50 dark:hover:bg-white/10 dark:hover:text-white"
      :aria-label="t('auth.close')"
      @click="authModal.close()"
    >
      <UiIcon
        name="x"
        :size="18"
      />
    </button>

    <div
      v-if="isAuthTab"
      class="mb-7 flex w-fit gap-1 rounded-full bg-black/5 p-1 dark:bg-white/10"
    >
      <button
        type="button"
        :class="tabButtonClass('login')"
        @click="authModal.setView('login')"
      >
        {{ t('auth.tabs.login') }}
      </button>
      <button
        type="button"
        :class="tabButtonClass('register')"
        @click="authModal.setView('register')"
      >
        {{ t('auth.tabs.register') }}
      </button>
    </div>
    <div
      v-else-if="backTarget"
      class="mb-7 h-9"
    />

    <template v-if="authModal.view.value === 'login'">
      <h2
        :id="titleId"
        class="text-2xl font-bold"
      >
        {{ t('auth.login.heading') }}
      </h2>
      <p class="mt-1.5 text-sm text-black/60 dark:text-white/60">
        {{ t('auth.login.subheading') }}
      </p>

      <form
        class="mt-6 flex flex-col gap-4"
        @submit.prevent="handleLoginSubmit(false)"
      >
        <div>
          <label
            for="auth-login-identifier"
            class="mb-2 block text-xs font-bold"
          >{{ t('auth.login.identifierLabel') }}</label>
          <UiInput
            id="auth-login-identifier"
            v-model="login.identifier"
            icon="user"
            autocomplete="username"
            :placeholder="t('auth.login.identifierPlaceholder')"
          />
        </div>
        <div>
          <label
            for="auth-login-password"
            class="mb-2 block text-xs font-bold"
          >{{ t('auth.login.passwordLabel') }}</label>
          <UiInput
            id="auth-login-password"
            v-model="login.password"
            icon="lock"
            :type="showLoginPassword ? 'text' : 'password'"
            autocomplete="current-password"
            :placeholder="t('auth.login.passwordPlaceholder')"
          >
            <template #trailing>
              <button
                type="button"
                class="shrink-0 text-black/40 hover:text-black/70 dark:text-white/40 dark:hover:text-white/70"
                :aria-label="showLoginPassword ? t('auth.hidePassword') : t('auth.showPassword')"
                @click="showLoginPassword = !showLoginPassword"
              >
                <UiIcon
                  :name="showLoginPassword ? 'eye-off' : 'eye'"
                  :size="17"
                />
              </button>
            </template>
          </UiInput>
        </div>

        <p
          v-if="loginError"
          class="-mt-1 text-xs font-semibold text-red-600 dark:text-red-400"
        >
          {{ loginError }}
        </p>
        <UiButton
          v-if="needsReactivation"
          type="button"
          variant="secondary"
          class="w-full justify-center"
          :disabled="loginLoading"
          @click="handleLoginSubmit(true)"
        >
          {{ t('auth.login.reactivate') }}
        </UiButton>

        <div class="-mt-1 flex items-center justify-between">
          <label
            for="auth-login-remember"
            class="flex items-center gap-2 text-xs text-black/60 dark:text-white/60"
          >
            <input
              id="auth-login-remember"
              v-model="login.remember"
              type="checkbox"
              class="h-[15px] w-[15px] accent-brand-600"
            >
            {{ t('auth.login.rememberMe') }}
          </label>
          <button
            type="button"
            class="text-xs font-semibold"
            @click="goToForgotPassword"
          >
            {{ t('auth.login.forgotPassword') }}
          </button>
        </div>

        <UiButton
          type="submit"
          class="mt-1.5 h-[46px] w-full justify-center rounded-xl!"
          :disabled="loginLoading"
        >
          {{ t('auth.login.submit') }}
        </UiButton>
      </form>

      <p class="mt-5 text-center text-sm text-black/60 dark:text-white/60">
        {{ t('auth.login.switchPrompt') }}
        <button
          type="button"
          class="font-bold text-black dark:text-white"
          @click="authModal.setView('register')"
        >
          {{ t('auth.login.switchAction') }}
        </button>
      </p>
    </template>

    <template v-else-if="authModal.view.value === 'register'">
      <h2
        :id="titleId"
        class="text-2xl font-bold"
      >
        {{ t('auth.register.heading') }}
      </h2>
      <p class="mt-1.5 text-sm text-black/60 dark:text-white/60">
        {{ t('auth.register.subheading') }}
      </p>

      <form
        class="mt-6 flex flex-col gap-4"
        @submit.prevent="handleRegisterSubmit"
      >
        <div>
          <label
            for="auth-register-name"
            class="mb-2 block text-xs font-bold"
          >{{ t('auth.register.fullNameLabel') }}</label>
          <UiInput
            id="auth-register-name"
            v-model="register.fullName"
            icon="user"
            autocomplete="name"
            :placeholder="t('auth.register.fullNamePlaceholder')"
          />
        </div>
        <div>
          <label
            for="auth-register-email"
            class="mb-2 block text-xs font-bold"
          >{{ t('auth.register.emailLabel') }}</label>
          <UiInput
            id="auth-register-email"
            v-model="register.email"
            type="email"
            icon="mail"
            autocomplete="email"
            :placeholder="t('auth.register.emailPlaceholder')"
          />
        </div>
        <div>
          <label
            for="auth-register-password"
            class="mb-2 block text-xs font-bold"
          >{{ t('auth.register.passwordLabel') }}</label>
          <UiInput
            id="auth-register-password"
            v-model="register.password"
            icon="lock"
            :type="showRegisterPassword ? 'text' : 'password'"
            autocomplete="new-password"
            :placeholder="t('auth.register.passwordPlaceholder')"
          >
            <template #trailing>
              <button
                type="button"
                class="shrink-0 text-black/40 hover:text-black/70 dark:text-white/40 dark:hover:text-white/70"
                :aria-label="showRegisterPassword ? t('auth.hidePassword') : t('auth.showPassword')"
                @click="showRegisterPassword = !showRegisterPassword"
              >
                <UiIcon
                  :name="showRegisterPassword ? 'eye-off' : 'eye'"
                  :size="17"
                />
              </button>
            </template>
          </UiInput>
        </div>

        <div>
          <label
            for="auth-register-confirm"
            class="mb-2 block text-xs font-bold"
          >{{ t('auth.register.confirmPasswordLabel') }}</label>
          <UiInput
            id="auth-register-confirm"
            v-model="register.confirmPassword"
            icon="lock"
            :type="showRegisterPassword ? 'text' : 'password'"
            autocomplete="new-password"
            :placeholder="t('auth.register.confirmPasswordPlaceholder')"
          />
        </div>

        <label
          for="auth-register-terms"
          class="-mt-1 flex items-start gap-2 text-xs text-black/60 dark:text-white/60"
        >
          <input
            id="auth-register-terms"
            v-model="register.acceptTerms"
            type="checkbox"
            required
            class="mt-0.5 h-[15px] w-[15px] shrink-0 accent-brand-600"
          >
          <i18n-t
            keypath="auth.register.terms"
            tag="span"
            class="leading-relaxed"
            :name="siteName"
          >
            <template #tos>
              <NuxtLinkLocale
                to="/legal/terms-of-service"
                target="_blank"
                rel="noopener"
                class="font-semibold"
              >{{ t('auth.register.termsTos') }}</NuxtLinkLocale>
            </template>
            <template #privacy>
              <NuxtLinkLocale
                to="/legal/privacy-policy"
                target="_blank"
                rel="noopener"
                class="font-semibold"
              >{{ t('auth.register.termsPrivacy') }}</NuxtLinkLocale>
            </template>
          </i18n-t>
        </label>

        <p
          v-if="registerError"
          class="-mt-1 text-xs font-semibold text-red-600 dark:text-red-400"
        >
          {{ registerError }}
        </p>

        <UiButton
          type="submit"
          class="mt-1.5 h-[46px] w-full justify-center rounded-xl!"
          :disabled="registerLoading"
        >
          {{ t('auth.register.submit') }}
        </UiButton>
      </form>

      <p class="mt-5 text-center text-sm text-black/60 dark:text-white/60">
        {{ t('auth.register.switchPrompt') }}
        <button
          type="button"
          class="font-bold text-black dark:text-white"
          @click="authModal.setView('login')"
        >
          {{ t('auth.register.switchAction') }}
        </button>
      </p>
    </template>

    <template v-else-if="authModal.view.value === 'forgot-password'">
      <h2
        :id="titleId"
        class="text-2xl font-bold"
      >
        {{ t('auth.forgotPassword.heading') }}
      </h2>
      <p class="mt-1.5 text-sm text-black/60 dark:text-white/60">
        {{ t('auth.forgotPassword.subheading') }}
      </p>

      <form
        class="mt-6 flex flex-col gap-4"
        @submit.prevent="handleForgotPasswordSubmit"
      >
        <div>
          <label
            for="auth-forgot-email"
            class="mb-2 block text-xs font-bold"
          >{{ t('auth.forgotPassword.emailLabel') }}</label>
          <UiInput
            id="auth-forgot-email"
            v-model="forgotEmail"
            type="email"
            icon="mail"
            autocomplete="email"
            :placeholder="t('auth.forgotPassword.emailPlaceholder')"
          />
        </div>

        <p
          v-if="resetError"
          class="-mt-1 text-xs font-semibold text-red-600 dark:text-red-400"
        >
          {{ resetError }}
        </p>

        <UiButton
          type="submit"
          class="mt-1.5 h-[46px] w-full justify-center rounded-xl!"
          :disabled="forgotPasswordLoading"
        >
          {{ t('auth.forgotPassword.submit') }}
        </UiButton>
      </form>

      <p class="mt-5 text-center text-sm">
        <button
          type="button"
          class="font-bold text-black dark:text-white"
          @click="authModal.setView('login')"
        >
          {{ t('auth.forgotPassword.backToLogin') }}
        </button>
      </p>
    </template>

    <template v-else-if="authModal.view.value === 'otp'">
      <h2
        :id="titleId"
        class="text-2xl font-bold"
      >
        {{ t('auth.otp.heading') }}
      </h2>
      <p class="mt-1.5 text-sm text-black/60 dark:text-white/60">
        {{ t('auth.otp.subheading', { email: authModal.resetEmail.value }) }}
        <button
          type="button"
          class="font-semibold text-black hover:underline dark:text-white"
          @click="goToChangeEmail"
        >
          {{ t('auth.otp.changeEmail') }}
        </button>
      </p>

      <form
        class="mt-6 flex flex-col gap-5"
        @submit.prevent="handleOtpSubmit"
      >
        <UiOtpInput
          v-model="otpCode"
          :aria-label="t('auth.otp.codeLabel')"
          class="justify-center"
        />

        <p
          v-if="otpError"
          class="-mt-2 text-center text-xs font-semibold text-red-600 dark:text-red-400"
        >
          {{ otpError }}
        </p>

        <p class="text-center text-xs text-black/60 dark:text-white/60">
          <span v-if="countdown.isActive.value">{{ t('auth.otp.resendCountdown', { time: countdownLabel }) }}</span>
          <button
            v-else
            type="button"
            class="font-bold text-black dark:text-white"
            :disabled="resendLoading"
            @click="handleResend"
          >
            {{ t('auth.otp.resend') }}
          </button>
        </p>

        <UiButton
          type="submit"
          class="w-full justify-center"
          :disabled="otpCode.length !== 6 || otpLoading"
        >
          {{ t('auth.otp.submit') }}
        </UiButton>
      </form>
    </template>

    <template v-else-if="authModal.view.value === 'verify-email'">
      <h2
        :id="titleId"
        class="text-2xl font-bold"
      >
        {{ t('auth.verifyEmail.heading') }}
      </h2>
      <p class="mt-1.5 text-sm text-black/60 dark:text-white/60">
        {{ t('auth.verifyEmail.subheading', { email: session.user.value?.email ?? '' }) }}
      </p>

      <form
        class="mt-6 flex flex-col gap-5"
        @submit.prevent="handleVerifySubmit"
      >
        <UiOtpInput
          v-model="verifyCode"
          :aria-label="t('auth.otp.codeLabel')"
          class="justify-center"
        />

        <p
          v-if="verifyError"
          class="-mt-2 text-center text-xs font-semibold text-red-600 dark:text-red-400"
        >
          {{ verifyError }}
        </p>

        <p class="text-center text-xs text-black/60 dark:text-white/60">
          <span v-if="verifyCountdown.isActive.value">{{ t('auth.otp.resendCountdown', { time: verifyCountdownLabel }) }}</span>
          <button
            v-else
            type="button"
            class="font-bold text-black dark:text-white"
            :disabled="verifyResendLoading"
            @click="handleVerifyResend"
          >
            {{ t('auth.otp.resend') }}
          </button>
        </p>

        <UiButton
          type="submit"
          class="w-full justify-center"
          :disabled="verifyCode.length !== 6 || verifyLoading"
        >
          {{ t('auth.verifyEmail.submit') }}
        </UiButton>
        <button
          type="button"
          class="text-center text-xs font-semibold text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white"
          @click="skipVerification"
        >
          {{ t('auth.verifyEmail.skip') }}
        </button>
      </form>
    </template>

    <template v-else-if="authModal.view.value === 'reset-password'">
      <template v-if="!resetSuccess">
        <h2
          :id="titleId"
          class="text-2xl font-bold"
        >
          {{ t('auth.resetPassword.heading') }}
        </h2>
        <p class="mt-1.5 text-sm text-black/60 dark:text-white/60">
          {{ t('auth.resetPassword.subheading') }}
        </p>

        <form
          class="mt-6 flex flex-col gap-4"
          @submit.prevent="handleResetPasswordSubmit"
        >
          <div>
            <label
              for="auth-reset-password"
              class="mb-2 block text-xs font-bold"
            >{{ t('auth.resetPassword.newPasswordLabel') }}</label>
            <UiInput
              id="auth-reset-password"
              v-model="resetPassword.password"
              icon="lock"
              :type="showResetPassword ? 'text' : 'password'"
              autocomplete="new-password"
              :placeholder="t('auth.resetPassword.newPasswordPlaceholder')"
            >
              <template #trailing>
                <button
                  type="button"
                  class="shrink-0 text-black/40 hover:text-black/70 dark:text-white/40 dark:hover:text-white/70"
                  :aria-label="showResetPassword ? t('auth.hidePassword') : t('auth.showPassword')"
                  @click="showResetPassword = !showResetPassword"
                >
                  <UiIcon
                    :name="showResetPassword ? 'eye-off' : 'eye'"
                    :size="17"
                  />
                </button>
              </template>
            </UiInput>
          </div>
          <div>
            <label
              for="auth-reset-confirm-password"
              class="mb-2 block text-xs font-bold"
            >{{ t('auth.resetPassword.confirmPasswordLabel') }}</label>
            <UiInput
              id="auth-reset-confirm-password"
              v-model="resetPassword.confirmPassword"
              icon="lock"
              :type="showResetConfirmPassword ? 'text' : 'password'"
              autocomplete="new-password"
              :placeholder="t('auth.resetPassword.confirmPasswordPlaceholder')"
            >
              <template #trailing>
                <button
                  type="button"
                  class="shrink-0 text-black/40 hover:text-black/70 dark:text-white/40 dark:hover:text-white/70"
                  :aria-label="showResetConfirmPassword ? t('auth.hidePassword') : t('auth.showPassword')"
                  @click="showResetConfirmPassword = !showResetConfirmPassword"
                >
                  <UiIcon
                    :name="showResetConfirmPassword ? 'eye-off' : 'eye'"
                    :size="17"
                  />
                </button>
              </template>
            </UiInput>
          </div>

          <p
            v-if="resetError"
            class="-mt-1 text-xs font-semibold text-red-600 dark:text-red-400"
          >
            {{ resetError }}
          </p>

          <UiButton
            type="submit"
            class="mt-1.5 h-[46px] w-full justify-center rounded-xl!"
            :disabled="resetPasswordLoading"
          >
            {{ t('auth.resetPassword.submit') }}
          </UiButton>
        </form>
      </template>

      <template v-else>
        <div class="flex flex-col items-center py-2 text-center">
          <div class="flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-700 dark:bg-brand-700/20 dark:text-brand-100">
            <UiIcon
              name="check"
              :size="26"
            />
          </div>
          <h2
            :id="titleId"
            class="mt-4 text-2xl font-bold"
          >
            {{ t('auth.resetPassword.successHeading') }}
          </h2>
          <p class="mt-1.5 text-sm text-black/60 dark:text-white/60">
            {{ t('auth.resetPassword.successBody') }}
          </p>
          <UiButton
            class="mt-6 w-full justify-center"
            @click="continueToLogin"
          >
            {{ t('auth.resetPassword.continueToLogin') }}
          </UiButton>
        </div>
      </template>
    </template>

    <template v-else-if="authModal.view.value === 'two-factor'">
      <h2
        :id="titleId"
        class="text-2xl font-bold"
      >
        {{ t('auth.twoFactor.heading') }}
      </h2>
      <p class="mt-1.5 text-sm text-black/60 dark:text-white/60">
        {{ t('auth.twoFactor.subheading') }}
      </p>

      <form
        class="mt-6 flex flex-col gap-4"
        @submit.prevent="handleTwoFactorSubmit"
      >
        <div>
          <label
            for="auth-two-factor-code"
            class="mb-2 block text-xs font-bold"
          >{{ t('auth.twoFactor.codeLabel') }}</label>
          <UiInput
            id="auth-two-factor-code"
            v-model="twoFactorCode"
            icon="shield-check"
            autocomplete="one-time-code"
            :placeholder="t('auth.twoFactor.codePlaceholder')"
          />
        </div>

        <p
          v-if="twoFactorError"
          class="-mt-1 text-xs font-semibold text-red-600 dark:text-red-400"
        >
          {{ twoFactorError }}
        </p>

        <UiButton
          type="submit"
          class="mt-1.5 h-[46px] w-full justify-center rounded-xl!"
          :disabled="twoFactorCode.length < 6 || twoFactorLoading"
        >
          {{ t('auth.twoFactor.submit') }}
        </UiButton>
      </form>

      <p class="mt-5 text-center text-xs text-black/50 dark:text-white/50">
        {{ t('auth.twoFactor.recoveryHint') }}
      </p>
    </template>

    <template v-if="isAuthTab">
      <div
        v-if="socialButtons.length"
        class="my-6 flex items-center gap-3"
      >
        <div class="h-px flex-1 bg-black/10 dark:bg-white/10" />
        <span class="text-xs text-black/50 dark:text-white/50">{{ t('auth.social.divider') }}</span>
        <div class="h-px flex-1 bg-black/10 dark:bg-white/10" />
      </div>

      <div
        v-if="socialButtons.length"
        class="flex gap-2.5"
      >
        <!-- Full page navigation on purpose: the provider's consent screen can't be framed. -->
        <a
          v-for="provider in socialButtons"
          :key="provider"
          :href="`/api/auth/social/${provider}/redirect`"
          class="flex h-[46px] w-full min-w-0 items-center justify-center gap-2.5 rounded-xl border border-black/10 bg-white text-sm font-semibold whitespace-nowrap text-black transition-colors hover:bg-black/5 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
        >
          <UiIcon
            :name="provider"
            filled
            :size="18"
          />
          {{ t(`auth.social.${provider}`) }}
        </a>
      </div>
    </template>
  </UiModal>
</template>
