import { NextResponse } from 'next/server'
import { sanitizeIncomingCatalogRecord } from '@/lib/catalogRecordSanitize'
import { authorizeCatalogApi } from '@/lib/admin/catalogApiAuth'
import type { CatalogProductRecord } from '@/lib/server/catalogStore'
import { readCatalogSnapshot, writeCatalogFile } from '@/lib/server/catalogStore'

const MAX_PRODUCTS = 5000

export async function GET(req: Request) {
  const gate = await authorizeCatalogApi(req, 'read')
  if (!gate.ok) {
    return NextResponse.json(
      { success: false, message: gate.error },
      { status: gate.status }
    )
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
  const gate = await authorizeCatalogApi(req, 'write')
  if (!gate.ok) {
    return NextResponse.json(
      { success: false, message: gate.error },
      { status: gate.status }
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
