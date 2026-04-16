import { NextResponse } from 'next/server'
import { readMediaSnapshot } from '@/lib/server/mediaStore'

export async function GET(req: Request) {
  const snapshot = await readMediaSnapshot()
  const url = new URL(req.url)
  const productId = (url.searchParams.get('productId') || '').trim()
  const pid = productId ? String(productId).trim() : ''
  const mediaFiles = pid
    ? snapshot.mediaFiles.filter((f) => String(f.productId ?? '').trim() === pid)
    : snapshot.mediaFiles
  return NextResponse.json(
    {
      success: true,
      count: mediaFiles.length,
      updatedAt: snapshot.updatedAt || null,
      mediaFiles,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
