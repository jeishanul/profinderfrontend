#!/usr/bin/env node
/**
 * Performance smoke test against a running site (staging, or production at a quiet hour):
 *
 *   node scripts/perf-smoke.mjs https://staging.example.com [/extra/path ...]
 *   npm run perf:smoke -- https://staging.example.com
 *
 * Each page is warmed, then requested CONCURRENCY at a time, REQUESTS times. Time to first byte is checked against the
 * budget in PERFORMANCE_PLAN.md (warm cache: p50 < 200 ms, p95 < 500 ms) and the script exits non-zero when a page
 * misses it. With NUXT_SERVER_TIMING=true on the server, one response's Server-Timing (each backend call, and
 * Laravel's own split when SERVER_TIMING=true there) is printed per page: where to look first.
 *
 * Every request carries a distinct X-Forwarded-For so the per-visitor rate limits are not what gets measured. That
 * header is only believed from a trusted proxy, so run it against the site through nginx, as visitors reach it.
 */
import { performance } from 'node:perf_hooks'

const BUDGET = { p50: 200, p95: 500 }
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 5)
const REQUESTS = Number(process.env.REQUESTS ?? 50)

const [base, ...extraPaths] = process.argv.slice(2)
if (!base) {
  console.error('Usage: node scripts/perf-smoke.mjs <base-url> [/extra/path ...]')
  process.exit(2)
}
const paths = ['/', '/browse', ...extraPaths]

/** Report lines go to stdout (the lint config keeps `console.log` out of app code). */
const print = line => process.stdout.write(`${line}\n`)

let visitor = 0
async function timeToFirstByte(url) {
  visitor++
  const started = performance.now()
  const response = await fetch(url, { headers: { 'X-Forwarded-For': `10.250.${(visitor >> 8) & 255}.${visitor & 255}`, 'Accept': 'text/html' } })
  const ttfb = performance.now() - started
  await response.arrayBuffer()
  return { ttfb, status: response.status, serverTiming: response.headers.get('server-timing') }
}

function percentile(sorted, p) {
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))]
}

let failed = false
for (const path of paths) {
  const url = new URL(path, base).toString()
  const warm = await timeToFirstByte(url)
  if (warm.status !== 200) {
    print(`${path.padEnd(32)} HTTP ${warm.status}: skipped`)
    failed = true
    continue
  }

  const times = []
  let next = 0
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (next++ < REQUESTS) times.push((await timeToFirstByte(url)).ttfb)
  }))
  times.sort((a, b) => a - b)
  const p50 = percentile(times, 0.5)
  const p95 = percentile(times, 0.95)
  const ok = p50 < BUDGET.p50 && p95 < BUDGET.p95
  failed ||= !ok

  print(`${ok ? 'ok  ' : 'SLOW'} ${path.padEnd(28)} TTFB p50 ${p50.toFixed(0).padStart(4)} ms  p95 ${p95.toFixed(0).padStart(4)} ms   (budget ${BUDGET.p50}/${BUDGET.p95})`)
  if (warm.serverTiming) {
    for (const entry of warm.serverTiming.split(/,\s*(?=[a-z0-9]+;)/)) print(`       ${entry}`)
  }
}

process.exit(failed ? 1 : 0)
