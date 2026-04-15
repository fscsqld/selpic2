import { NextResponse } from 'next/server'
import type { CatalogProductRecord } from '@/lib/server/catalogStore'
import { readCatalogSnapshot, writeCatalogFile } from '@/lib/server/catalogStore'

const MAX_PRODUCTS = 5000

function getBearerToken(req: Request): string | null {
  const h = req.headers.get('authorization') || req.headers.get('Authorization')
  if (h?.startsWith('Bearer ')) return h.slice(7).trim()
  const alt = req.headers.get('x-catalog-sync-secret')
  return alt?.trim() || null
}

function validateSecret(req: Request): boolean {
  const token = getBearerToken(req)
  const expected = (process.env.CATALOG_SYNC_SECRET || '').trim()
  if (!expected) return false
  return token === expected
}

function isValidRecord(p: unknown): p is CatalogProductRecord {
  if (!p || typeof p !== 'object') return false
  const o = p as Record<string, unknown>
  return (
    typeof o.id === 'string' &&
    o.id.length > 0 &&
    typeof o.name === 'string' &&
    typeof o.description === 'string' &&
    typeof o.price === 'number' &&
    Number.isFinite(o.price) &&
    typeof o.category === 'string' &&
    typeof o.inStock === 'boolean' &&
    typeof o.updatedAt === 'string'
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
    if (!isValidRecord(item)) continue
    const img = item.image
    const safeImage =
      typeof img === 'string' &&
      !img.startsWith('data:') &&
      !img.startsWith('indexeddb://') &&
      (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('/'))
        ? img
        : undefined
    products.push({
      id: item.id,
      name: item.name.slice(0, 500),
      description: item.description.slice(0, 8000),
      price: item.price,
      category: item.category.slice(0, 200),
      subcategory: typeof item.subcategory === 'string' ? item.subcategory.slice(0, 200) : undefined,
      inStock: item.inStock,
      updatedAt: item.updatedAt,
      hasDetailPage: item.hasDetailPage,
      ...(safeImage ? { image: safeImage.slice(0, 2000) } : {})
    })
  }

  const updatedAt = new Date().toISOString()
  await writeCatalogFile({ updatedAt, products })

  return NextResponse.json({ success: true, count: products.length, updatedAt })
}

