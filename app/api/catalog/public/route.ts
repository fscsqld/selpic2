import { NextResponse } from 'next/server'
import { readCatalogProducts } from '@/lib/server/catalogStore'

/**
 * Public read-only catalog for the storefront (no secret).
 * Populated when admin saves products with CATALOG_SYNC_SECRET / NEXT_PUBLIC_CATALOG_SYNC_SECRET configured.
 */
export async function GET() {
  const products = await readCatalogProducts()
  return NextResponse.json(
    { success: true, count: products.length, products },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } }
  )
}
