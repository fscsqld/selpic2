import { NextResponse } from 'next/server'
import { readMediaSnapshot } from '@/lib/server/mediaStore'

export async function GET(req: Request) {
  const snapshot = await readMediaSnapshot()
  const url = new URL(req.url)
  const productId = (url.searchParams.get('productId') || '').trim()
  const mediaFiles = productId
    ? snapshot.mediaFiles.filter((f) => (f.productId || '').trim() === productId)
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
