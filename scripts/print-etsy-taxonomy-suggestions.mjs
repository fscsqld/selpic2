/**
 * Print Etsy seller taxonomy leaf candidates for SELPIC (stickers / name labels).
 *
 * Loads `.env.local` (same keys as Vercel): ETSY_CLIENT_ID + ETSY_CLIENT_SECRET
 * → calls GET https://openapi.etsy.com/v3/application/seller-taxonomy/nodes
 * → flattens the tree and ranks rows matching sticker / label / decal / vinyl / paper / craft.
 *
 * Usage (from repo root):
 *   npm run etsy:taxonomy
 *
 * Then copy one `id` into Vercel as ETSY_DEFAULT_TAXONOMY_ID (prefer a leaf whose `path` matches your product).
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function loadDotEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return
  const raw = fs.readFileSync(filePath, 'utf8')
  for (const line of raw.split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line)
    if (!m) continue
    const key = m[1]
    let val = m[2]
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val
  }
}

function walk(node, pathParts, out) {
  if (!node || typeof node !== 'object') return
  const name = typeof node.name === 'string' ? node.name.trim() : ''
  const idRaw = node.id
  const id = typeof idRaw === 'number' ? idRaw : Number(idRaw)
  const nextPath = name ? [...pathParts, name] : pathParts
  if (name && Number.isFinite(id) && id > 0) {
    out.push({ id, name, path: nextPath.join(' > ') })
  }
  const kids = node.children
  if (Array.isArray(kids)) {
    for (const c of kids) walk(c, nextPath, out)
  }
}

function collectNodes(root) {
  const out = []
  if (Array.isArray(root)) {
    for (const n of root) walk(n, [], out)
    return out
  }
  if (root && typeof root === 'object') {
    if (Array.isArray(root.results)) {
      for (const n of root.results) walk(n, [], out)
      return out
    }
    if (Array.isArray(root.children)) {
      for (const n of root.children) walk(n, [], out)
      return out
    }
    walk(root, [], out)
  }
  return out
}

const KEYWORDS = [
  'sticker',
  'label',
  'name',
  'decal',
  'vinyl',
  'paper',
  'craft',
  'sheet',
  'custom',
  'party',
]

function scoreRow(row) {
  const hay = `${row.path} ${row.name}`.toLowerCase()
  let s = 0
  for (const kw of KEYWORDS) {
    if (!hay.includes(kw)) continue
    if (kw === 'sticker' || kw === 'label') s += 3
    else if (kw === 'name' || kw === 'decal' || kw === 'vinyl') s += 2
    else s += 1
  }
  if (hay.includes('sticker') && hay.includes('paper')) s += 2
  return s
}

async function main() {
  const root = path.join(__dirname, '..')
  loadDotEnvFile(path.join(root, '.env.local'))
  loadDotEnvFile(path.join(root, '.env'))

  const clientId = (process.env.ETSY_CLIENT_ID || process.env.ETSY_API_KEY || '').trim()
  const secret = (process.env.ETSY_CLIENT_SECRET || '').trim()
  if (!clientId || !secret) {
    console.error('Missing ETSY_CLIENT_ID (or ETSY_API_KEY) or ETSY_CLIENT_SECRET in .env.local')
    process.exit(1)
  }
  const xApiKey = `${clientId}:${secret}`

  const url = 'https://openapi.etsy.com/v3/application/seller-taxonomy/nodes'
  const res = await fetch(url, { headers: { 'x-api-key': xApiKey } })
  const text = await res.text()
  if (!res.ok) {
    console.error(`Etsy HTTP ${res.status}:`, text.slice(0, 500))
    process.exit(1)
  }
  let json
  try {
    json = JSON.parse(text)
  } catch {
    console.error('Invalid JSON from Etsy')
    process.exit(1)
  }

  const flat = collectNodes(json)
  const ranked = flat
    .map((row) => ({ row, score: scoreRow(row) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.row.path.length - b.row.path.length)

  const top = ranked.slice(0, 25).map((x) => x.row)

  console.log('SELPIC-oriented Etsy seller taxonomy candidates (from your app keys).\n')
  console.log('Pick one LEAF id that matches your listing type, then set Vercel:')
  console.log('  ETSY_DEFAULT_TAXONOMY_ID=<id>\n')
  if (top.length === 0) {
    console.log('No rows matched sticker/label keywords. Try widening KEYWORDS in this script or use the admin API:')
    console.log('  GET /api/admin/integrations/etsy/taxonomy/nodes?q=sticker')
    process.exit(0)
  }
  console.log('id\tpath')
  for (const r of top) {
    console.log(`${r.id}\t${r.path}`)
  }
  console.log('\nSuggested first value to try (highest score, verify path in Etsy Shop Manager):')
  console.log(String(top[0].id))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
