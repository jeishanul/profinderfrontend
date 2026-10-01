# ProFinder — Architecture Contract

This file is the source of truth for how code gets added to this project. It exists so that
every future feature — whoever or whatever implements it — lands in the same structure, using
the same patterns, without re-deriving these decisions each time. Read it before adding any
page, component, composable, or API route. If a change would contradict this file, update this
file in the same change.

## Stack

- **Nuxt 4** (`app/` as `srcDir`), Vue 3.5 Composition API, `<script setup lang="ts">` only.
- **TypeScript**, strict mode + extra strictness flags (see `nuxt.config.ts` → `typescript`).
- **Tailwind CSS v4** via `@tailwindcss/vite` (not the old `@nuxtjs/tailwindcss` module — v4's
  own Vite plugin is the supported integration).
- **@nuxtjs/seo** (site-config, robots, sitemap, og-image, schema-org, seo-utils, link-checker).
- **@nuxtjs/i18n** — multi-locale-ready, only `en` active (see Internationalization below).
- **@vueuse/nuxt** for generic reactive utilities, **@pinia/nuxt** for cross-component state,
  **@nuxt/image**, **@nuxt/fonts**, **@nuxt/icon** for media/perf.
- **@nuxtjs/color-mode** for the light/dark theme toggle — persists to `localStorage`, applied by
  a blocking inline script the module injects before hydration so there's no flash of the wrong
  theme on refresh despite not being cookie-based. `classSuffix: ''` in `nuxt.config.ts` so the
  class is plain `dark`/`light`, matching the `@custom-variant dark` override in `main.css` (see
  Styling rules below) — Tailwind's `dark:` no longer follows `prefers-color-scheme` directly, only the
  class. `preference: 'system'` is the fallback until a user picks explicitly (see
  `UiThemeToggle.vue`).
- **Vitest** (`@nuxt/test-utils` `nuxt` environment) for tests, **ESLint** (`@nuxt/eslint`,
  flat config, stylistic rules on) as the *only* formatter/linter — no Prettier.
- **nuxt-security** for response security headers/CSP/CORS/rate limiting, **eslint-plugin-vuejs-accessibility**
  (flat config, `flat/recommended`) for lint-time a11y checks. `@nuxt/a11y` (runtime axe-core
  auditing) is intentionally **not** installed — it's still alpha (`1.0.0-alpha.1`) as of this
  writing. Revisit once it reaches a stable release; don't install an alpha runtime module into
  this baseline in the meantime.

## Directory conventions (do not deviate)

```
app/                  # srcDir — all Vue app code
  components/
    ui/                # generic, reusable, presentational — <UiButton/>, <UiInput/>
    OgImage/            # OG image templates — <Default.satori.vue> etc.
    AppHeader.vue        # one-off / singleton app chrome — TOP LEVEL, not nested
    AppFooter.vue
  composables/          # top-level files only — reused reactive logic (see rule below)
  layouts/
  middleware/
  pages/                # file-based routing
  plugins/
  utils/                # top-level files only — reused pure functions, auto-imported
  assets/css/main.css    # Tailwind entry + @theme tokens — the ONLY global CSS file
server/
  api/                  # /api/* routes
  utils/                # auto-imported server-only helpers
shared/
  types/                # types usable in app AND server
  utils/                # pure functions usable in app AND server (no Vue/Nitro imports)
```

### The nested-component-prefix gotcha

Nuxt prefixes auto-imported component names with their subdirectory path:
`components/ui/Button.vue` → `<UiButton />`, `components/form/Input.vue` → `<FormInput />`.
**Do not put a component in a subdirectory unless you want that prefix.** App-wide singleton
components (header, footer, etc.) belong directly in `components/`, not in a `components/layout/`
subfolder — nesting them there silently renames them (e.g. `<LayoutAppHeader/>`) and breaks any
template that references the un-prefixed name. This bit us once during scaffolding; don't repeat it.

## Import & alias rules

Most code needs **no import statement at all** — components, composables, and utils under
`app/` are auto-imported by convention (see Component rules and Composables rules below). Only
reach for an explicit import for: a named export from a third-party package, a sibling file in
the *same* folder (`./foo`), or something outside the auto-import scan (nested composable/util
files, cross-boundary code). When you do need one, use the right Nuxt alias — never a `../`
relative path:

| From → to | Alias |
|---|---|
| `app/` → `app/` (different folder) | `~/...` or `@/...` (both point at `app/`) |
| anywhere → project root (`nuxt.config.ts`, root-level configs) | `~~/...` or `@@/...` |
| `app/` or `server/` → `shared/` | `#shared/...` |
| `app/` → `server/` | `#server/...` |
| explicit Vue/Nuxt core imports (rare — e.g. disambiguating a shadowed name) | `#imports` |

**`import/no-relative-parent-imports` is an ESLint error** (`eslint.config.mjs`, backed by the
`import-x/resolver: { typescript: true }` setting — without that setting the rule silently
no-ops, so don't remove it). Any `../` import fails lint; a same-folder `./sibling` import is
still fine and doesn't need an alias. This is enforced now and for every future feature — if
lint rejects a `../` import, fix the import, don't disable the rule.

## Component rules

- Every reusable piece of UI (buttons, inputs, cards, modals, badges — anything used, or
  plausibly reusable, in more than one place) **must** be a component under `app/components/`.
  Generic/presentational ones go in `components/ui/` (prefixed `Ui*`); feature-specific ones
  can live at top level or in a feature subfolder if the feature grows enough to warrant it.
- `<script setup lang="ts">` only. No Options API. No `.js` component files.
- Props via `defineProps<{...}>()` (+ `withDefaults` for defaults). Prefer typed emits via
  `defineEmits<{...}>()`. Avoid Reactive Props Destructure — reference `props.foo`, not bare
  destructured reactive props.
- Prefer `shallowRef` over `ref` when deep reactivity isn't needed.

## Composables & utils rules — the reuse contract

**If the same piece of logic (not just markup) is used in more than one place, it becomes a
composable or util — never copy-pasted.**

- Stateful / reactive logic, or anything that calls other composables → `app/composables/useX.ts`,
  auto-imported. Only top-level files are scanned; re-export nested ones via `composables/index.ts`.
- Pure functions with no reactivity → `app/utils/` (client/SSR app code) or `shared/utils/`
  (needed by both `app/` and `server/`, e.g. `slugify`). `shared/utils` must not import Vue or
  Nitro-specific code.
- All calls to our own backend go through `useApi` (`app/composables/useApi.ts`, built on Nuxt's
  `createUseFetch`) — never call `useFetch`/`$fetch` against `/api/*` directly from a component.
  This is where auth headers, base URL, and error handling for our API live, in one place.
- Composables/utils must be called inside a valid context (script setup, `setup()`,
  `defineNuxtPlugin`, `defineNuxtRouteMiddleware`) — never at module scope.
- State that must survive SSR and be request-isolated goes through `useState`, never a
  module-level `ref`/`reactive` (module-level state leaks across requests on the server).
- Reach for **Pinia** only when state is genuinely cross-cutting/complex (multi-module,
  actions with side effects, devtools-inspectable). Simple per-feature state stays in a
  composable over `useState`.

## Data fetching rules

- Critical, SEO-relevant data: `await useApi(...)` (blocks navigation, lands in SSR payload,
  no double-fetch).
- Non-critical data: `useApi(..., { lazy: true })` and handle `status === 'pending'`.
- Always pass an explicit key for `useAsyncData`/dynamic `useFetch` calls — don't rely on the
  auto-generated key.
- Never call `$fetch` alone at the top of `<script setup>` for a component's initial data — it
  double-fetches (once on the server, once on the client). Use `useApi`/`useFetch`/`useAsyncData`.
- Trim payload size with `pick`/`transform` when the full response isn't needed client-side.

## Internationalization (i18n)

**`@nuxtjs/i18n` is installed and wired for multi-locale SEO from day one. Only `en` is active**
(`nuxt.config.ts` → `i18n.locales`), but every rule below applies now, to the one active locale,
not just "once we add a second one" — that's what makes adding a locale later a config change
instead of a rework.

- **Never hardcode user-facing text.** Every string a user reads — nav labels, headings, button
  text, SEO title/description, error messages — goes in `i18n/locales/<code>.json` and is read
  via `useI18n()`'s `t()` in script, or `$t()`/`<i18n-t>` in templates. This applies to brand-new
  features exactly as much as it applied when this was set up — see `app/pages/index.vue`,
  `app/components/AppHeader.vue`, and `app/error.vue` for the pattern.
- **Mixed text + markup** (a translated sentence that needs a `<code>`/`<strong>`/link span in
  the middle) uses `<i18n-t keypath="..." tag="p">` with named `<template #slotName>` blocks
  matching `{slotName}` placeholders in the message — never string-concatenate HTML into a
  translation. See `home.bodyIntro` in `i18n/locales/en.json` + its usage in `index.vue`.
- **Links**: use `<NuxtLinkLocale>` instead of `<NuxtLink>` for in-app navigation, and
  `useLocalePath()` instead of a raw path string when navigating programmatically
  (`navigateTo`, `clearError({ redirect: ... })`, etc.). Both keep the active locale's prefix
  automatically and cost nothing extra with only one locale active.
- **A locale switcher already exists** (`app/components/ui/LocaleSwitcher.vue`, used in
  `AppHeader`) built on `<SwitchLocalePathLink>`. It renders nothing while `locales.length === 1`
  — don't remove it because "it's not showing anything yet"; it activates the moment a second
  locale is added.
- **Routing strategy is `prefix_except_default`**: English stays at clean unprefixed URLs
  (`/about`), any future locale gets its own prefix (`/fr/about`). Don't change this without
  reading the routing strategy table in the `nuxt-i18n` skill (`prefix` vs `prefix_and_default`
  vs `no_prefix` all trade off differently for SEO/caching) — an established strategy shouldn't
  change casually once locales/URLs are live and indexed.
- **Global SEO head wiring lives once, in `app/app.vue`**, via `useLocaleHead({ seo: true })` →
  `useHead()`. This sets `html[lang]`/`[dir]`, self-referencing canonical, hreflang alternates
  (+ `x-default`), and `og:locale` for every route automatically. **Do not duplicate this
  per-page** — a page only needs its own `useSeoMeta`/`defineOgImage`/`useSchemaOrg` calls (see
  SEO checklist below), never its own canonical/hreflang/lang logic.
- **Sitemap is already locale-aware with zero extra config**: `@nuxtjs/sitemap` detects
  `@nuxtjs/i18n` and emits a `sitemap_index.xml` with one per-locale sitemap
  (`__sitemap__/en-US.xml` today), each `<url>` carrying its own hreflang `<xhtml:link>`
  alternates. Verified by building and curling `/sitemap_index.xml` — don't hand-roll a sitemap
  or add a second one; this is automatic per locale added.
- **Adding a new locale** (e.g. `fr`): add one entry to `i18n.locales` in `nuxt.config.ts`
  (`code`, `language` as a BCP 47 tag, `name`, `file`, `dir` if RTL), add
  `i18n/locales/fr.json` with the same key structure as `en.json`, and set
  `i18n.fallbackLocale` in a new `i18n/i18n.config.ts` if you want a fallback other than
  silently missing keys. Nothing else needs to change — routing, hreflang, sitemap, the locale
  switcher, and OG images all pick it up automatically. Verify with `npx nuxt prepare`, then the
  full checklist in "Before considering any feature done" below, then load both locales and
  confirm hreflang return tags are bidirectional (the `seo-hreflang` skill's validation rules)
  and the switcher round-trips between them.
- **Composables/utils that produce user-facing strings** (e.g. a future `formatCurrency`-style
  util) must accept/derive the active locale rather than hardcoding one — `useI18n().locale` or
  a passed-in `locale` argument, not `'en-US'` baked into the function.

## SEO checklist — every new page must do this

1. `useSeoMeta({ title, description, ...})` (translated via `t()` — see Internationalization
   above) — title is picked up by the `titleTemplate` set in `app/app.vue` (renders as
   `"<page title> · ProFinder"`).
2. `defineOgImage('<ComponentName>', { ... })` using a component from `app/components/OgImage/`
   (see the renderer-suffix note below). Add a new template there for new content types instead
   of overloading `Default.satori.vue`.
3. `useSchemaOrg([...])` with the appropriate `define*()` (`defineWebPage`, `defineArticle`,
   `defineProduct`, `defineBreadcrumb`, etc. — see `nuxt-seo` skill reference).
4. Anything that shouldn't be indexed (admin, previews, etc.) sets `robots` via `routeRules` or
   `useRobotsRule(...)`, not a manual `<meta>` tag.
5. Pages that are fully static should get `routeRules: { '<path>': { prerender: true } }' in
   `nuxt.config.ts`; content-driven/high-traffic pages should use `isr`/`swr` instead of full SSR
   — but see the `isr` payload-extraction gotcha under Rendering & performance before reaching
   for it.

### OG image renderer suffix

`nuxt-og-image` requires an explicit renderer per component: name the file `Name.satori.vue`
(fast, edge-compatible, partial CSS — default choice) or `Name.takumi.vue`. **The registered
component name strips the `OgImage/` directory prefix**, e.g. `components/OgImage/Default.satori.vue`
is used as `defineOgImage('DefaultSatori', ...)` or `defineOgImage('Default.satori', ...)` — NOT
`'OgImageDefault.satori'`. After adding/renaming a template, run `npx nuxt prepare` and check
`.nuxt/module/nuxt-og-image-components.d.ts` if the exact key is unclear, then confirm with
`npm run typecheck`. Satori-rendered templates: flex only (no `grid`), no unsized `position:
absolute`, use `@nuxt/fonts` for custom fonts.

## Styling rules

- Tailwind v4 only. All design tokens (colors, fonts) are defined once via `@theme` in
  `app/assets/css/main.css` — never hardcode a one-off hex color in a component; add a token.
- No component-scoped `<style>` blocks unless Tailwind genuinely cannot express the rule; if you
  do add one, it needs `@reference` to access theme vars.
- Dark mode via the `dark:` variant on the same element, not separate components. Dark mode
  strategy is **class-based, not media-query**: `main.css` overrides Tailwind's default with
  `@custom-variant dark (&:where(.dark, .dark *));`, and `@nuxtjs/color-mode` puts that `.dark`
  (or `.light`) class on `<html>` — resolved from the OS preference by default, pinned to
  whichever the user picks via `<UiThemeToggle>` (see Stack above). Never add a bare
  `@media (prefers-color-scheme: dark)` rule of your own — it would apply regardless of the
  user's explicit choice and silently disagree with every `dark:` utility on the page.
- Every page needs an explicit background/text color reaching all the way to `<body>` (already
  set once in `main.css`) — relying on the browser's default canvas color broke visibly under a
  dark OS preference before this was added (translucent/white surfaces read as muddy gray). Don't
  remove that base rule, and give any new full-bleed section its own explicit background rather
  than assuming white/black underneath.
- Tailwind v4 syntax reminders: `@import "tailwindcss"` (no `@tailwind` directives), custom
  utilities via `@utility` (not `@layer utilities`), important modifier goes at the end
  (`bg-red-500!`), arbitrary CSS vars are `bg-(--brand-color)`.

## Rendering & performance

- Default rendering is universal SSR. Use `routeRules` in `nuxt.config.ts` for hybrid rendering
  per route (`prerender`, `isr`, `swr`, `ssr: false` for authenticated/dashboard-style routes).
- **`isr` real bug hit here**: giving `/` (or any route that's never actually prerendered)
  `{ isr: <seconds> }` made the client request a `_payload.json` for it on every load — the
  payload-extraction path `isr` shares with prerendered routes — which 404s (nothing wrote that
  file) and produces a genuine hydration mismatch, not just a console nicety. Confirmed by
  removing `isr` and re-testing: 404s and the mismatch both disappeared. `/` and
  `/providers/**` are plain SSR for exactly this reason (see `routeRules` comment in
  `nuxt.config.ts`). Don't reach for `isr`/`swr` on a route with dynamic per-request data without
  verifying the payload file actually gets produced in the target deploy target first.
- `experimental.ssrStreaming` is intentionally **off**. It conflicts with `@nuxtjs/seo`'s
  header/robots mutations during render (`NUXT_E8001`/`NUXT_E8002` warnings, and it also broke
  page-level `useSeoMeta` overrides during scaffolding testing). Don't re-enable it without
  first confirming the SEO module stack tolerates it.
- Heavy/below-the-fold components: use `Lazy` + a hydration strategy
  (`hydrate-on-visible`, `hydrate-on-interaction`, `hydrate-on-idle`, etc.) instead of eager
  hydration.
- Images go through `<NuxtImg>`/`<NuxtPicture>` (`@nuxt/image`), never a bare `<img>` for
  content images. Fonts go through `@nuxt/fonts`, never a manual Google Fonts `<link>`.
- `NuxtLink` prefetches on visibility by default (see `experimental.defaults.nuxtLink`) — no
  need to configure this per-link.

## TypeScript rules

- `strict: true` plus `noUncheckedIndexedAccess`, `noImplicitOverride`,
  `noFallthroughCasesInSwitch`, `forceConsistentCasingInFileNames` (see `nuxt.config.ts`).
  Don't weaken these; if a file needs an escape hatch, fix the types instead.
- No `any`. Type API responses explicitly (see `HealthResponse` in `app/pages/index.vue` for the
  pattern) rather than trusting inference through `useApi`.
- Full type-checking runs via `npm run typecheck` (not on every `dev`/`build`, for speed) — run
  it before considering a change done.

## Testing

- Vitest with `@nuxt/test-utils`'s `nuxt` environment (`vitest.config.ts`).
- Co-locate tests next to the code (`slugify.ts` + `slugify.test.ts`), not in a parallel `tests/`
  tree.
- New composables/utils get a test. New pages/components get one when they contain real logic
  (not just markup).

## Linting & git hooks

- ESLint (`eslint.config.mjs`) is the single source of truth for style — flat config,
  `@nuxt/eslint` with `stylistic: true`. Project-specific rules on top: components must be
  `<script setup>` + TypeScript (`vue/component-api-style`, `vue/block-lang`).
- Husky + lint-staged run `eslint --fix` on staged `.js/.ts/.vue` files pre-commit
  (`.husky/pre-commit`, `lint-staged` in `package.json`).

## Environment / SEO indexing

- `NUXT_PUBLIC_SITE_URL` and `NUXT_SITE_INDEXABLE` (see `.env.example`) drive `@nuxtjs/seo`'s
  `site.url`/`site.indexable`. **`indexable` defaults to `false`** unless the env var is
  explicitly `"true"` — fail-safe so staging/preview deployments never get indexed by accident.
  Set both in production's real environment config before launch.

## Before considering any feature "done"

1. `npm run lint` — clean.
2. `npm run typecheck` — clean.
3. `npm run test` — clean, with a new test for new logic.
4. New/changed pages satisfy the SEO checklist above.
5. Any new reusable markup became a component; any new reused logic became a composable/util —
   nothing copy-pasted.

## Error pages (`app/error.vue`, `app/pages/[...slug].vue`)

- Nuxt only hands an unmatched route to `error.vue` if something actually throws. Vue Router
  finding no match does **not** trigger it by itself — that's why this project has
  `app/pages/[...slug].vue`, a catch-all that does `throw createError({ statusCode: 404, ...,
  fatal: true })`. Without `fatal: true`, the error is treated as a recoverable/non-fatal error
  and **`error.vue` renders as an empty node during SSR** (blank until client-side hydration
  papers over it) — a real bug we hit and fixed here, not a hypothetical.
- **`useRobotsRule()` does not work inside `error.vue`** — calling it there silently breaks SSR
  entirely (the whole page renders as an empty `<!---->` node, no thrown error, no log). Use
  `useSeoMeta({ robots: '...' })` instead, which works fine in the error-render context. Don't
  reintroduce `useRobotsRule` in `error.vue` without re-verifying against a real SSR build
  (`npm run build && node .output/server/index.mjs`, not just `npm run dev`) — this bug reproduced
  identically in both dev and production.

## Security (`nuxt-security`)

- Response security headers (CSP, HSTS, X-Frame-Options, Permissions-Policy, etc.) come from
  `nuxt-security` with its defaults, **except CORS**: the module's own default binds
  `corsHandler.origin` to the *dev server* URL (`nuxt.options.devServer.url`), which is never a
  real production domain — so left alone, cross-origin requests from our own real site would
  silently fail while requests with no `Origin` header (curl, server-to-server) got a harmless
  `*`. `nuxt.config.ts` now binds `security.corsHandler.origin` explicitly to
  `NUXT_PUBLIC_SITE_URL`. If this app ever needs a *different* origin to call its API (a separate
  marketing site, a mobile app, a partner integration), extend `corsHandler.origin` to an array —
  don't widen it to `*`.
- **CSRF is on** (`nuxt-csurf`). Every POST/PUT/PATCH/DELETE needs the `csrf-token` header, which
  `useApiFetch` attaches for you (see Calling our API below). A raw `$fetch` mutation fails with 403.
- **Rate limiting is on by default** (150 requests / 5 min / IP) using the `lruCache` in-memory
  driver. That driver is per-process — fine for a single instance, but it resets on redeploy and
  doesn't share state across horizontally-scaled instances. If/when this deploys to more than one
  instance behind a load balancer, switch `security.rateLimiter.driver` to a shared store (e.g.
  Redis) or rate limiting won't be effective.
- **Production host binding**: when self-hosting the Nitro `node-server` output directly (not
  behind Vercel/Netlify/Cloudflare's own edge), bind it to `127.0.0.1` (`NITRO_HOST=127.0.0.1`)
  and put a reverse proxy (Nginx/Caddy) in front — don't bind `0.0.0.0` directly to the public
  internet. Not configurable from this repo (it's a deployment-environment setting), but note it
  before choosing a hosting setup.
- **OG image signing secret**: `nuxt-og-image` signs its generated URLs with an auto-generated
  secret by default, which changes on every build/restart. Harmless for local dev and a
  single-instance deploy. For a rolling deploy or more than one instance, set
  `NUXT_OG_IMAGE_SECRET` (see `.env.example`, generate with `npx nuxt-og-image generate-secret`)
  so a URL signed by one instance/build still validates on another — otherwise OG images 404
  intermittently during/after a rolling deploy.

## Patterns added with the marketplace work (use these, don't reinvent)

### Calling our API: `useApi` vs `useApiFetch`

- **`useApi`** — reads: initial and reactive GETs (SSR-safe, keyed, refetch when `query` changes).
- **`useApiFetch`** — one-off calls from event handlers: every mutation, uploads, and "load another
  page". It wraps `$csrfFetch` (adds the CSRF header) and sends a 401 back to the login modal.
- Errors: show `apiErrorMessage(error, t('…fallback'))` (`utils/apiError.ts`) in a toast. Never swallow
  a failed action silently and never show raw server text without a translated fallback.
- Routes that call `readFormData` on the server (uploads) must be sent as `FormData`, not JSON.

### Feedback and confirmation

- **`useToast()`** (`toast.success/error/info(message, action?)`, rendered once by `<UiToastContainer/>`
  in `app.vue`). An `action` (`{ label, run }`) gives a toast an "Undo" button — prefer undo over a
  confirm for reversible actions (archive, unsave).
- **`useConfirm()`** replaces `window.confirm`: `if (!(await confirm({ title, message, confirmLabel, tone: 'danger' }))) return`.
  Use it for destructive or irreversible actions. Never call `window.confirm`/`alert`.

### Site settings and money

- **`useSiteSettings()`** exposes the admin-editable settings (name, logo, contact details, currency,
  maintenance mode) loaded once by a plugin. Read them from here; never hardcode a brand name, email,
  phone or social link in a component.
- **Money**: API fields are still called `…Usd` for history, but the value is in the site currency
  (PHP by default). Format with `const { money } = useSiteSettings()` → `money(amount)`, or the pure
  `formatMoney(amount, currency, locale)` in `utils/money.ts`. Never write `$${amount}` or `₱${amount}`.

### Roles

- The Provider/Consumer switch is the **`pf_role` cookie** (read during SSR so the first paint is the
  right panel), seeded into `useState('active-role')` by `useSession()`. `useSession().activeRole` can only
  be `provider` when `AuthUser.isProvider` is true, so a stale cookie can't expose provider UI. Gate UI
  on `session.isProvider` / `activeRole`, never on the raw cookie. It is a presentation preference, not
  authorization: the API enforces what each account may do.

### The booking flow (quote → booking, cash payments)

- A booking starts as a **job request** (`<MarketplaceJobRequestModal/>`: what, when, where) that opens a
  conversation. The provider answers with a **quote** (`<DashboardQuoteFormModal/>`) and accepting the
  quote creates the booking. Nothing on the client creates a booking directly.
- **Booking drawer**: `useBookingDrawer().open(id)` opens `<DashboardBookingDrawer/>` (mounted once in the
  dashboard layout). It shows detail and the actions the server allows. Render buttons from
  `booking.can.*` (computed server-side by `BookingStateMachine`); never infer them from `status`.
- **Book again**: `useBookAgain()`. `start(bookingId)` reopens the thread and opens the job-request form
  pre-filled; `requestFrom(providerId, name)` opens it empty (saved providers). Both drive the single modal
  mounted in the dashboard layout. Neither books anything by itself.
- Reviews: `useReviewForm()` + `<DashboardReviewFormModal/>`; `<UiStarInput/>` for the rating.

### Lists and paging

- Account-area lists (`clients`, `purchases`, `services`, `saved-providers`, `conversations`) are
  server-paged: `{ data, meta: { page, perPage, total, hasMore } }`. Use **`usePagedList<T>(url, { key, query, perPage })`**:
  it returns `items`, `meta`, `hasMore`, `loadMore()`, `refresh()` (keeps the pages already loaded) and works
  with or without `await`. Put filters in `query` (a change refetches page 1) and render
  `<DashboardLoadMore/>` under the list. Status chip counts and headline numbers come from `meta.counts` /
  `meta.totals` — never compute them from the loaded rows.
- Search boxes on paged lists debounce (`refDebounced(search, 300)`) and send `q` to the server.
- Pass new list params through the BFF with `pickListQuery(getQuery(event))` (`server/utils/apiProxy.ts`),
  which forwards only `page`, `perPage`, `q`, `status`, `archived`.
- Public Browse keeps its filters in the URL (the URL is the source of truth) — see `pages/browse.vue`.

### Private files through the BFF

- Chat attachments are private on the backend. The browser can't hold the token, so
  `server/api/dashboard/messages/[id]/attachment.get.ts` adds the caller's credentials and **streams** the
  file (`$fetch.raw(..., { responseType: 'stream' })` + `sendStream`) with `cache-control: private, no-store`.
  Never buffer these through `callApi`, and never expose a storage URL for them.

## Known benign warnings (do not "fix" these)

- `[@nuxtjs/og-image] OG image URLs are signed with an auto-generated secret...` — expected in
  dev and until `NUXT_OG_IMAGE_SECRET` is set for production (see above). Not a bug.
- `Plugin "nuxt:devtools:config-retriever" defines Vite-specific hooks (configResolved) ... These
  hooks will be ignored.` — an upstream Nuxt DevTools/Vite compatibility warning (DevTools hasn't
  fully adopted Vite's newer Environment API yet). It's internal to `@nuxt/devtools`, appears only
  in `dev` with devtools enabled, has no effect on the app, and isn't something in this repo to
  patch. It will go away on its own once DevTools catches up to Vite; don't spend time chasing it.
- `npm install` prints `vue-i18n@10.0.8: v9 and v10 no longer supported` — that's a transitive,
  unused copy pulled in by `@intlify/vue-i18n-extensions`
  (`node_modules/@intlify/vue-i18n-extensions/node_modules/vue-i18n`). The app actually resolves
  the top-level `vue-i18n@11.4.10`. Re-check on the next `@nuxtjs/i18n` bump; don't try to force
  a resolution override for it.
- `[nuxt-site-config] url "..." should not be localhost` during local `dev`/`build` without a
  real `NUXT_PUBLIC_SITE_URL` set — expected whenever that env var falls back to
  `http://localhost:...` (see `.env.example`). Harmless locally; make sure the real env var is
  set in every deployed environment (already required — see Environment / SEO indexing above).

## Accessibility

- `eslint-plugin-vuejs-accessibility`'s `flat/recommended` config is active in
  `eslint.config.mjs` (20 rules: alt-text, aria-*, click-events-have-key-events, label
  association, heading structure, etc.) — this is enforced at lint time, so `npm run lint`
  catches regressions. It's a static/lint-time check only; it doesn't catch everything a runtime
  auditor (axe-core) would. Revisit adding `@nuxt/a11y` once it's out of alpha (see Stack above).
- The `brand-*` (primary green) and `accent-*` (secondary amber) color tokens in
  `app/assets/css/main.css` were checked against WCAG 2.1 contrast minimums before being picked:
  `brand-600` on white ≈ 5.42:1, `brand-700` on white ≈ 8.16:1, `brand-500` on black ≈ 5.73:1 (all
  pass AA for normal text, `brand-700` passes AAA). `accent-700` on white ≈ 6.42:1 (safe for text);
  `accent-500`/`accent-600` fall below 4.5:1 on white and are for non-text UI only (icons, fills,
  badge backgrounds — where the 3:1 non-text minimum applies), never for body text or links. If you
  add a new color token, check its contrast against the surface it'll actually sit on before using
  it for text or icons — don't assume a token is safe just because it's already in `@theme`.

## Known upstream caveat

`satori` (via `nuxt-og-image`) currently pulls a `fflate` version with a known moderate
advisory (`GHSA-px8p-9vwx-vf98`, malformed-ZIP64 DoS). It's exercised only at OG-image
render/build time, not by arbitrary user input in this app's current routes. Re-check
`npm audit` when `nuxt-og-image`/`satori` get bumped, since a fix may land upstream.
