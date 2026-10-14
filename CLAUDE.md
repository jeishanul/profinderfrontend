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

## CMS-driven landing page

The landing page (`app/pages/index.vue`) is a loop over the sections the admin configured, not a fixed list. The
backend owns the layout; this app renders it.

- `useHomeSections()` (awaited in `index.vue`) reads `/api/home` (Nitro proxy -> Laravel `/v1/home`): the active
  sections in the admin's order, each a `HomeSection` (`shared/types/cms.ts`) with eyebrow/heading/subheading, rich
  `body`, image + alt, background image, button, `settings` and `items`.
- **i18n stays the fallback.** Every admin text field can be empty; components read it with `cmsText(value, t('...'))`
  (`app/utils/cms.ts`), so clearing a field restores the built-in copy and a fresh install is never blank. Don't remove
  the i18n keys a built-in section falls back to.
- If `/api/home` *fails*, `resolveHomeSections` renders the default layout (`DEFAULT_HOME_SECTION_KEYS`). A successful
  but empty list means the admin hid everything and is respected.
- Built-in sections (`hero_slides`, `trust_stats`, `how_it_works`, `categories`, `featured_providers`,
  `why_choose_us`, `jobs_gallery`, `testimonials`, `app_download`, `faq`) are matched by `section.key` in `index.vue`.
  Their list data (providers, gallery, testimonials, FAQ, categories) still comes from their own endpoints and is only
  fetched when that section is on the page. Sections added by the admin render through `<CmsBlock>`
  (`app/components/cms/`) by `section.type`; an unknown type renders nothing.
- **Featured providers** has a `mode` setting: `auto` (best-rated verified, may prefer the visitor's province) or
  `manual` (only providers the admin featured, no province preference, section hidden when none). The query for each
  is `featuredQuery()` in `app/utils/featuredProviders.ts`; keep both modes working when touching the home page fetch.
- **Adding a block type:** add it to the backend's `config/content_blocks.php`, add a `Cms*` component and a `v-else-if`
  in `CmsBlock.vue`, with a test in `components/cms/Cms.test.ts`.
- Section wrappers carry `:id="sectionAnchor(section, ...)"` so menu links like `/#how-it-works` work; anything that
  points at a section (e.g. `ScrollHintArrow`) takes the anchor as a prop and only renders when that section exists.
- Admin-typed links go through `<CmsLink>` (site paths stay in-app, external links open safely, anything unsafe renders
  as plain text) and admin HTML through `<UiRichText>`. Never put admin values straight into `href` or `v-html`.
- Images from the admin are `<NuxtImg>` with the admin's alt text; the old icon/`UiPlaceholderMedia` stays as the
  fallback until an image is uploaded.
- **Image fallbacks, most specific first:** a gallery tile's photo, then its category's picture, then the site's default
  gallery photo (`settings.defaultGalleryImageUrl`), then the icon placeholder; a provider's cover, then
  `defaultProviderCoverUrl`; a person's photo, then `defaultAvatarUrl`, then initials (`UiAvatar`); a store's badge
  image (`appStoreBadgeUrl` / `playStoreBadgeUrl`) replaces its text badge. Each default is empty until the admin sets
  it, so nothing changes until then.

## CMS-driven header, footer and mobile menu

The header links, footer columns and rows, bottom links, social icons and the mobile menu's extra links come from the
admin, like the landing page.

- `app.vue` fetches `/api/navigation` (Nitro proxy -> Laravel `/v1/navigation`) next to the settings; `useNavigation()`
  reads it from that shared cache and returns `{ navigation, viewer }`. Footer copyright and the second tagline come
  from the settings (`useFooterText()`; `{year}` and `{siteName}` are filled in).
- Links are already resolved to final addresses by the backend (a link to a page, category or home-page section
  arrives as its path, `/#anchor` for a section). Render them with `<CmsLink :to :new-tab>`, never a raw `href`.
- **Visibility is decided here**, not by the backend (its payload is cached and shared): filter with
  `visibleLinks` / `visibleMenus` / `visibleColumns` (`app/utils/navigation.ts`) using `viewer`. A menu or column left
  empty for the visitor is dropped. "Everyone except providers" is how the header hides "Become a provider".
- Footer columns are arrays of stacked menus (`NavMenu[][]`); the grid width is `columns + 3` (brand, contact, app).
  The phone footer shows only the page-list menus plus the bottom links (`compactFooterLinks`).
- **If `/api/navigation` fails**, `defaultNavigation(t, settings)` supplies the built-in links (the i18n keys under
  `nav.*` and `footer.customers/providers.*` exist for exactly this), so keep those keys. An admin-emptied menu is
  respected; only a failed request falls back.
- Social networks come as `{ network, label, url }`; the network is also the icon name (`socialIconName`). To add a
  network: backend `config/social_networks.php` plus a drawing in `app/utils/icons.ts`.

## Data fetching rules

- Critical, SEO-relevant data: `await useApi(...)` (blocks navigation, lands in SSR payload,
  no double-fetch).
- Non-critical data: `useApi(..., { lazy: true })` and handle `status === 'pending'`.
- Always pass an explicit key for `useAsyncData`/dynamic `useFetch` calls — don't rely on the
  auto-generated key.
- Never call `$fetch` alone at the top of `<script setup>` for a component's initial data — it
  double-fetches (once on the server, once on the client). Use `useApi`/`useFetch`/`useAsyncData`.
- Trim payload size with `pick`/`transform` when the full response isn't needed client-side.
- **Never `await` independent requests one after another.** Each `await` is a full round trip added to every
  server render. Start every request the page needs (`const xRequest = useApi(...)`, which hands back its `data`
  ref at once), then `await Promise.all([...])` once. Only a request that needs another's *answer* may wait for
  it: the home page's lists need `/home` to know which sections exist, and the city/barangay pages need the SEO
  response for the city code (city slugs repeat across provinces). Today's floor is 3 rounds on `/` (shell, then
  layout + categories, then lists) and 2 on every other public page. Keep it there.
- **Personal data stays out of the server render.** Saved-provider hearts use `useSavedProviders().loadAfterMount()`,
  and the unread badges use `server: false`. Never `await` personal data in page setup: in the browser that
  changes the markup mid-hydration. The session is the exception, since the header must be right on first paint.
  The global middleware *starts* it, and `app.vue` awaits it together with settings and navigation
  (`useSession().loadUser()`, one shared request). Await `loadUser()`, not `fetchUser()`, anywhere that needs
  the answer.
- **Public reads are cached in Nitro.** A `server/api/*` handler for data that is the same for every visitor calls
  `getPublicApi(event, path, query)` (`server/utils/publicApi.ts`), not `callApi`. It is served from Nitro's shared
  cache (Redis in production) for 60 s, then stale-while-revalidate, so an admin's edit shows within about a minute
  with no purge step. It never sends the visitor's token, so first check that the Laravel endpoint doesn't read the
  user: grep its controller and resources for `->user(`.
  - An answer that changes for a signed-in viewer (the provider page: owner preview, `canReply`) passes
    `{ viewerDependent: true }`. Only visitors without a session are then served from the cache.
  - Personal data and writes keep `callApi`. So do free-text searches (`/providers?q=`): every phrasing would be
    its own entry.
  - `NUXT_API_CACHE=false` switches the cache off.
- **Fetched data is shallow** (`useAsyncData.deep: false`, Nuxt 4's default). Never change it in place
  (`data.value.items.push(...)`, `row.read = true`): replace `data.value` as a whole, or copy it into a local `ref`
  first, as `ProviderReviews.vue` does.
- **A browser-only request that several components share** (same key, `server: false`, like the unread badges in
  `useUnreadCounts`) needs `dedupe: 'defer'`. With the default `cancel`, each component that mounts aborts the
  previous request and sends its own, and the aborted ones still reach the server.
- App-shell components (header, footer, layouts) run on every page, so they must not fetch for something only one
  page shows. The header's docked search reads the home page's categories with `useNuxtData('categories')` and is
  only rendered on `/`.

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
2. `useShareImage(adminImageUrl, '<TemplateName>', { ... })` (not `defineOgImage` directly): the admin's own
   share image for the page wins, then the site's default share image (Settings), and only with neither does it
   fall back to a generated card from `app/components/OgImage/` (see the renderer-suffix note below). Add a new
   template there for new content types instead of overloading `Default.satori.vue`. The SEO module re-bases a
   non-https `og:image` onto this site's origin, so `/storage/**` is proxied to the backend (`routeRules` in
   `nuxt.config.ts`); keep that rule.
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
  hydration. The home sections below the hero do (`pages/index.vue`): measured at −6% main-thread work under 6× CPU
  throttling.
- **Overlays most visitors never open** (the login modal, the mobile "More" sheet, the confirm dialog) are
  `<Lazy… v-if="mounted">` with `mounted = useMountWhenNeeded(() => isOpen)`. This keeps their code and CSS off
  the first page load and their closed markup out of every server render. Do the same for any new global overlay.
  Note: `hydrate-never` is **not** enough to keep a component's JavaScript out: Nuxt still `modulepreload`s every
  module rendered on the server.
- **The QR code is an `<img>` of `/api/qr`** (SVG made on the server, cached a day), so the QR encoder never ships
  to browsers.
- **Price and date formatting** go through the cached formatters in `utils/intl.ts`
  (`cachedNumberFormat`/`cachedDateTimeFormat`/`cachedRelativeTimeFormat`). Never call `new Intl.*Format` in code
  that runs per card or per row.
- **`server/plugins/runtime-config.ts` must stay.** @nuxtjs/i18n calls `useRuntimeConfig(event)` on every request,
  sub-requests included, and Nitro then rebuilds the whole config from environment variables for that event. That
  was ~37% of the SSR server's CPU. The plugin hands each request a plain copy of the start-up config first. If a
  module upgrade changes how runtime config is read, re-profile (`node --cpu-prof .output/server/index.mjs` under
  load) before removing it.
- **Finding a slow page:** set `NUXT_SERVER_TIMING=true` (frontend) and `SERVER_TIMING=true` (backend). The page's
  `Server-Timing` header then lists the render time and every backend call it made, each with Laravel's database time
  and query count (devtools > Network > Timing). `npm run perf:smoke -- <base-url> [paths]` checks the key pages
  against the performance budget in PERFORMANCE_PLAN.md and exits non-zero when one misses it.
- Generated OG images: keep the props to a bounded set (a fixed title per page type, not a filtered count). Every
  distinct set of props is its own satori render on the server.
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
- **Rate limiting is on**: 600 requests / 5 min / IP globally, and 60 / 5 min on `/api/auth/**`
  (`security.rateLimiter` and `routeRules` in `nuxt.config.ts`), using the `lruCache` in-memory
  driver. Laravel throttles per account/IP as well.
- **Visitor address (`server/utils/clientIp.ts`, tagged by `server/plugins/client-ip.ts`).** Every request from
  outside is tagged in Nitro's `request` hook, before any middleware runs. The tag is the socket address, or
  `X-Forwarded-For` read from the right, but only when the socket peer is a trusted proxy (`NUXT_TRUSTED_PROXIES`,
  loopback by default, which is nginx). Never trust the browser's own `X-Forwarded-For`: a visitor could rotate it
  to dodge per-IP limits. That is also why nginx must *overwrite* the header with `$remote_addr`.
  - SSR sub-requests are in-process (node-mock-http, marked `__unenv__`) and have no socket. They inherit the
    tag, because Nitro copies the page request's headers onto them. `callApi` forwards that tag to Laravel as
    `X-Forwarded-For`, so use `getVisitorIp(event)`, never `getRequestIP(event)`, which is empty on a sub-request.
  - The limiter keys on `x-profinder-rate-limit-key` (`security.rateLimiter.ipHeader`). Sub-requests carry the
    white-listed internal key, so a page view costs one token, not one per API call. External requests always
    get both tags overwritten, so a browser can't claim to be internal.
  - Laravel's `api` limiter gives GETs relayed by this server (a trusted proxy) a separate 1200/min bucket.
    Writes and direct calls keep 240/min.
- **Timeouts.** `callApi` gives Laravel 5 s for a read and 30 s for a write (`API_TIMEOUT_MS`), never retries,
  and turns a timeout into a 504. `useApi` allows 8 s and doesn't retry during SSR. A slow API therefore degrades
  a page to its fallbacks instead of hanging the render. `useApiFetch` (browser-only actions and uploads)
  deliberately has no timeout.
- The rate-limit driver is per-process, so production (a PM2 cluster, `deploy/pm2/ecosystem.config.cjs`)
  sets `NUXT_REDIS_URL`: `server/plugins/redis-storage.ts` then remounts the limiter's storage (and Nitro's
  `cache` storage) on Redis at runtime, shared by every worker, with an expiry the limiter itself never sets.
  Without `NUXT_REDIS_URL` (local dev) both stay in memory. Don't configure `security.rateLimiter.driver`
  in `nuxt.config.ts` instead: that is fixed at build time.
- **Production host binding**: when self-hosting the Nitro `node-server` output directly (not
  behind Vercel/Netlify/Cloudflare's own edge), bind it to `127.0.0.1` (`NITRO_HOST=127.0.0.1`)
  and put a reverse proxy (Nginx/Caddy) in front — don't bind `0.0.0.0` directly to the public
  internet. `deploy/pm2/ecosystem.config.cjs` sets this, and `deploy/nginx/profinder.conf` is the proxy.
  Deploys go through `deploy/deploy.sh`: each build is copied to `.releases/<timestamp>` and `.current` is
  swapped atomically, and `/_nuxt` chunks accumulate in `.assets` so pages rendered by the previous build
  still load. Don't point PM2 or nginx at `.output` directly; it is rebuilt in place.
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
- **Error shape**: the BFF re-throws Laravel's error body inside `createError({ data })`, so a failed
  response is `{ statusCode, message, data: <Laravel body> }` — Laravel's own `errors`/`code`/`message`
  live one level deeper, at `error.data.data`, not `error.data`. Always go through `utils/apiError.ts`'s
  helpers (`apiErrorMessage`, `apiFieldErrors`, `apiErrorCode`) instead of reading `error.data` directly —
  they already unwrap that nesting (and tolerate a flatter body from older mocks/direct Laravel calls).
  `apiErrorCode(error)` reads Laravel's machine-readable `code` (`email_unverified`,
  `account_deactivated`, `provider_unverified`, …) — use it instead of string-matching `message`.
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
- **`middleware/provider.ts`** guards the provider-only pages (Services, Clients) at the route level —
  apply it (`definePageMeta({ middleware: ['provider'] })`) to any new page a non-provider shouldn't be
  able to open by URL. It runs after `auth` and redirects a signed-in non-provider to
  `/become-a-provider` instead of letting them land on a page whose every action 404s.

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
- **Refreshing after a booking-affecting action** (a quote accepted/declined, a booking status change, a
  review posted): call **`useRefreshBookingLists()`** (`composables/usePagedRefresh.ts`), not
  `refreshNuxtData(BOOKING_DATA_KEYS)` directly. A paged list's `refreshNuxtData` would re-fetch only page
  1 and drop every page loaded past it — `usePagedRefresh` keeps a per-list registry so a registered paged
  list refreshes in place (all its loaded pages intact) while everything else still goes through
  `refreshNuxtData`.
- Pass new list params through the BFF with `pickListQuery(getQuery(event))` (`server/utils/apiProxy.ts`),
  which forwards only `page`, `perPage`, `q`, `status`, `archived`.
- Public Browse keeps its filters in the URL (the URL is the source of truth) — see `pages/browse.vue`.

### Head tags on SEO landing pages

- `app.vue` emits the canonical, hreflang and og:locale tags for every route. A landing page
  (`/category/*`, `/ph/**`) calls **`useSeoLanding(meta, eyebrow)`** for its title, description, robots,
  schema.org and OG image; it overrides the canonical only when an admin set a custom one
  (`useCanonicalOverride`), so a page never emits two canonical tags. Never add a `<link rel="canonical">` per page.
- These pages are keyed by path (`definePageMeta({ key: route => route.path })`) so moving between two of them
  builds a fresh component; head and filter state never go stale. Search/sort/page state is
  `useSeoProviderFilters()`; the URL is the source of truth (back/forward restore it).
- All text on them is in `en.json` under `seo.*`.
- The favicon links live in `app.vue` (an admin-uploaded favicon replaces the built-in set), and `updateSiteConfig`
  there feeds the site name/description to structured data and OG tags.

### Categories

`useCategories({ withSkills?, lazy? })` is the only way to load categories: two cached variants
(`categories`, `categories-with-skills`), so a page never refetches what another one already has.

### Social sign-in and re-authentication

- The OAuth round trip lives in `server/api/auth/social/*`. What the person asked for before leaving (remember me,
  the page they were on, reactivating) travels in the httpOnly state cookie; a 2FA challenge or a "finish creating
  your account" token waits in a second httpOnly cookie (`SOCIAL_PENDING_COOKIE`) and is picked up by the BFF
  (`two-factor/challenge`, `social/complete`). Nothing sensitive goes in the URL. `safeReturnTo` only accepts
  same-site paths.
- Accounts created by social sign-in have no password (`AccountSettings.hasPassword`). Anything that asks for "your
  password" (change password, delete account, turn off 2FA, start 2FA setup) uses `<DashboardReauthField>` and
  `reauthBody()`, which switch to an emailed one-time code for those accounts.

### Seek Job (consumer-posted jobs)

- Consumer pages `/seek-job`, `/seek-job/new`, `/seek-job/[id]`, `/seek-job/[id]/edit`; provider pages `/find-jobs`, `/find-jobs/[id]`, `/find-jobs/applications` (`middleware: ['auth','provider']`). All are `ssr: false` + `robots: false` in `routeRules`.
- Shared helpers: `utils/jobPost.ts` (status/expiry helpers), `utils/offer.ts` + `<DashboardOfferFields>` (price/hours/extra rate/when — shared with `QuoteFormModal`), `useJobLabels()`, `useJobErrors()` (maps API `code` to `seekJob.errors.<code>` then `findJobs.errors.<code>`).
- BFF routes under `server/api/dashboard/{job-posts,seek-jobs,job-post-applications}/**`; query keys are whitelisted with `pickSeekJobQuery`.
- Hiring: `/seek-job/{id}?hire={applicationId}` opens the hire modal (used by the "Hire" button on the chat's job-application card).
- "New applicants" count rides on the `/dashboard/conversations/unread-count` poll (`UNREAD_APPLICANTS_KEY`), no extra request.
- Job photos and the exact address are private: photos stream through the BFF with the session; never put the post title in a notification `title/body`, only as the `subjectName` param.

### Testing the BFF

`callApi` is built by `createCallApi(deps)` (`server/utils/apiProxy.ts`) so its rules (token, client address,
401 clears the cookie) are unit-tested with plain fakes (`apiProxy.test.ts`). A handler that only forwards a body can
be tested by stubbing the Nitro globals (see `two-factor/setup.post.test.ts`, `// @vitest-environment node`).

### Browse filters

The pure URL/API query helpers for Browse live in `utils/browseQuery.ts` (`parseBrowseQuery`,
`toBrowseRouteQuery`, `toProviderApiQuery`) with tests; `pages/browse.vue` only wires them to the router.

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
