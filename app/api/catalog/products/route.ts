import { NextResponse } from 'next/server'
import { sanitizeIncomingCatalogRecord } from '@/lib/catalogRecordSanitize'
import type { CatalogProductRecord } from '@/lib/server/catalogStore'
import { readCatalogSnapshot, writeCatalogFile } from '@/lib/server/catalogStore'

const MAX_PRODUCTS = 5000

function getBearerToken(req: Request): string | null {
  const h = req.headers.get('authorization') || req.headers.get('Authorization')
  if (h?.startsWith('Bearer ')) return h.slice(7).trim()
  const alt = req.headers.get('x-catalog-sync-secret')
  return alt?.trim() || null
}

function isSameOriginRequest(req: Request): boolean {
  const origin = req.headers.get('origin') || req.headers.get('Origin')
  const host = req.headers.get('host') || req.headers.get('Host')
  if (!origin || !host) return false
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

function isSameOriginByReferer(req: Request): boolean {
  const referer = req.headers.get('referer') || req.headers.get('Referer')
  const host = req.headers.get('host') || req.headers.get('Host')
  if (!referer || !host) return false
  try {
    return new URL(referer).host === host
  } catch {
    return false
  }
}

function isSameOriginByFetchMetadata(req: Request): boolean {
  const site = (req.headers.get('sec-fetch-site') || '').toLowerCase()
  return site === 'same-origin'
}

function hasAdminWriteHint(req: Request): boolean {
  return (req.headers.get('x-selpic-admin-write') || '').trim() === '1'
}

function validateSecret(req: Request): boolean {
  const token = getBearerToken(req)
  const expected = (process.env.CATALOG_SYNC_SECRET || '').trim()
  if (expected && token === expected) return true
  // Fallback for legacy local-admin auth flow (no server session cookie):
  // accept only same-origin admin-marked writes.
  return (
    hasAdminWriteHint(req) &&
    (isSameOriginRequest(req) || isSameOriginByReferer(req) || isSameOriginByFetchMetadata(req))
  )
}

export async function GET(req: Request) {
  if (!validateSecret(req)) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }
  const snapshot = await readCatalogSnapshot()
  return NextResponse.json(
    {
      success: true,
      count: snapshot.products.length,
      updatedAt: snapshot.updatedAt || null,
      products: snapshot.products,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
export async function POST(req: Request) {
  if (!validateSecret(req)) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized or CATALOG_SYNC_SECRET not configured' },
      { status: 401 }
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid JSON' }, { status: 400 })
  }

  const list = (body as { products?: unknown })?.products
  if (!Array.isArray(list)) {
    return NextResponse.json({ success: false, message: 'Expected { products: [] }' }, { status: 400 })
  }

  if (list.length > MAX_PRODUCTS) {
    return NextResponse.json(
      { success: false, message: `Too many products (max ${MAX_PRODUCTS})` },
      { status: 400 }
    )
  }

  const products: CatalogProductRecord[] = []
  for (const item of list) {
    const rec = sanitizeIncomingCatalogRecord(item)
    if (rec) products.push(rec)
  }

  const updatedAt = new Date().toISOString()
  await writeCatalogFile({ updatedAt, products })

  return NextResponse.json({ success: true, count: products.length, updatedAt })
}

