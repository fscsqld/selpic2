import { NextResponse } from 'next/server'
import { hasUsableSupabaseBrowserEnv, readRawSupabasePublicEnv } from '@/lib/supabase/publicEnv'

/**
 * GET /api/health — 로컬에서 Next 서버가 살아 있는지 빠르게 확인할 때 사용
 */
export async function GET() {
  const { url } = readRawSupabasePublicEnv()
  let supabaseOrigin: string | null = null
  try {
    supabaseOrigin = url ? new URL(url).origin : null
  } catch {
    supabaseOrigin = null
  }

  return NextResponse.json(
    {
      ok: true,
      service: 'selpic',
      ts: new Date().toISOString(),
      build: {
        // Vercel populates these when deployed from Git.
        gitCommitSha: process.env.VERCEL_GIT_COMMIT_SHA || null,
        gitCommitRef: process.env.VERCEL_GIT_COMMIT_REF || null,
      },
      supabase: {
        hasPublicEnv: hasUsableSupabaseBrowserEnv(),
        origin: supabaseOrigin,
      },
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
