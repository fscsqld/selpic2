import { NextResponse } from 'next/server'

/**
 * GET /api/health — 로컬에서 Next 서버가 살아 있는지 빠르게 확인할 때 사용
 */
export async function GET() {
  return NextResponse.json(
    { ok: true, service: 'selpic', ts: new Date().toISOString() },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
