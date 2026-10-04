export default defineEventHandler(() => ({
  google: Boolean(socialClientId('google')),
  facebook: Boolean(socialClientId('facebook')),
}))
