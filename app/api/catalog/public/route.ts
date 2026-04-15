import { NextResponse } from 'next/server'
import { readCatalogSnapshot } from '@/lib/server/catalogStore'

/**
 * Public read-only catalog for the storefront (no secret).
 * Populated when admin saves products with CATALOG_SYNC_SECRET / NEXT_PUBLIC_CATALOG_SYNC_SECRET configured.
 */
export async function GET() {
  const snapshot = await readCatalogSnapshot()
  return NextResponse.json(
    {
      success: true,
      count: snapshot.products.length,
      updatedAt: snapshot.updatedAt || null,
      products: snapshot.products,
    },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } }
  )
}
