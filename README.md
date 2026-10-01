# ProFinder

Nuxt 4 + TypeScript + Tailwind CSS v4, with a full SEO/performance module stack. See
[`CLAUDE.md`](./CLAUDE.md) for the architecture rules and conventions this project follows —
read it before adding a page, component, composable, or API route.

## Stack

Nuxt 4 · Vue 3.5 (Composition API, `<script setup lang="ts">`) · TypeScript (strict) ·
Tailwind CSS v4 · `@nuxtjs/seo` (robots, sitemap, OG images, schema.org) · `@nuxtjs/i18n`
(multi-locale-ready, only `en` active) · Pinia · VueUse · `@nuxt/image` · `@nuxt/fonts` ·
`nuxt-security` (headers/CSP/CORS/rate limiting) · Vitest ·
ESLint (`@nuxt/eslint` + `eslint-plugin-vuejs-accessibility`)

## Setup

```bash
cp .env.example .env
npm install
```

## Development

```bash
npm run dev        # dev server, http://localhost:3838
```

## Quality gates

```bash
npm run lint        # ESLint
npm run lint:fix     # ESLint --fix
npm run typecheck    # nuxt typecheck (vue-tsc)
npm run test         # Vitest
```

## Production

```bash
npm run build        # build for the Nitro node-server preset
npm run preview       # preview the production build locally
npm run generate      # fully static generation, if/when routes allow it
```

Set `NUXT_PUBLIC_SITE_URL` and `NUXT_SITE_INDEXABLE=true` in the real production environment
before launch — see `.env.example`.

## Internationalization

Multi-locale routing, hreflang, per-locale sitemaps, and `og:locale` are fully wired via
`@nuxtjs/i18n` — only `en` is active today. Adding a locale is a config change, not a rework:
see `CLAUDE.md` → Internationalization for the exact steps and the rules every page/component
already follows (no hardcoded user-facing text, `<NuxtLinkLocale>`, etc.).

### Self-hosting the Node server

If deploying the Nitro `node-server` output directly (rather than to Vercel/Netlify/Cloudflare),
bind it to loopback and put a reverse proxy in front — don't expose it directly:

```bash
NITRO_HOST=127.0.0.1 NITRO_PORT=3000 node .output/server/index.mjs
```

Then point Nginx/Caddy/your load balancer at `127.0.0.1:3000`. See `CLAUDE.md` → Security for
the rest of the security posture (CORS, CSRF, rate limiting).
