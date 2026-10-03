#!/usr/bin/env node
/* eslint-disable no-console -- a CLI script reports its findings via stdout */
/**
 * Finds i18n leaf keys in `i18n/locales/en.json` that no source file appears
 * to reference. A leaf is flagged "unused" only when neither the full
 * dotted path nor any of its parent prefixes shows up anywhere under
 * `app/`, `server/` or `shared/` — prefixes count as a match so a dynamic
 * lookup (`t(\`notifications.kinds.${kind}.title\`)`) doesn't get every key
 * under `notifications.kinds` flagged as dead.
 *
 * This is a heuristic, not a guarantee: it can't see a key built from two
 * unrelated template-literal pieces, or a key only used in a test fixture
 * it doesn't scan. Review its output before deleting anything — don't pipe
 * it straight into `rm`/`sed`.
 *
 * Usage: node scripts/i18n-unused.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const localeFile = join(root, 'i18n/locales/en.json')
const scanDirs = ['app', 'server', 'shared'].map(d => join(root, d))
const scanExtensions = new Set(['.vue', '.ts', '.js', '.mjs'])

function flatten(obj, prefix = '') {
  const leaves = []
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      leaves.push(...flatten(value, path))
    }
    else {
      leaves.push(path)
    }
  }
  return leaves
}

function collectFiles(dir) {
  const files = []
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) files.push(...collectFiles(full))
    else if (scanExtensions.has(entry.slice(entry.lastIndexOf('.')))) files.push(full)
  }
  return files
}

const locale = JSON.parse(readFileSync(localeFile, 'utf8'))
const leaves = flatten(locale)

const sourceFiles = scanDirs.flatMap(collectFiles)
const sourceText = sourceFiles.map(f => readFileSync(f, 'utf8')).join('\n')

// Only the full path and multi-segment prefixes count as a match — a bare
// single-segment prefix (e.g. "dashboard") is so generic it shows up as a
// substring almost everywhere and would make every key look "used".
function prefixesOf(path) {
  const parts = path.split('.')
  const prefixes = []
  for (let i = 2; i <= parts.length; i++) prefixes.push(parts.slice(0, i).join('.'))
  return prefixes
}

const unused = leaves.filter(path => !prefixesOf(path).some(prefix => sourceText.includes(prefix)))

if (unused.length === 0) {
  console.log('No unused i18n leaves found.')
}
else {
  console.log(`${unused.length} possibly-unused i18n leaf key(s):\n`)
  for (const key of unused) console.log(`  ${key}`)
  console.log('\nThis is a heuristic (see the file header) — verify each one before deleting.')
}
