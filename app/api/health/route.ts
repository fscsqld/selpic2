import { NextResponse } from 'next/server'
import { isCronSecretConfigured } from '@/lib/env/cronSecret'
import { hasUsableSupabaseBrowserEnv, readRawSupabasePublicEnv } from '@/lib/supabase/publicEnv'

/**
 * GET /api/health — 로컬에서 Next 서버가 살아 있는지 빠르게 확인할 때 사용
 */
// deploy-trigger: no functional change — forces a new Git commit for Vercel/GitHub sync
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
        gitCommitMessage: process.env.VERCEL_GIT_COMMIT_MESSAGE || null,
        vercelDeploymentId: process.env.VERCEL_DEPLOYMENT_ID || null,
      },
      supabase: {
        hasPublicEnv: hasUsableSupabaseBrowserEnv(),
        origin: supabaseOrigin,
      },
      cron: {
        /** Runtime only — missing value does not fail `next build`. */
        secretConfigured: isCronSecretConfigured(),
        etsySyncPath: '/api/cron/etsy-sync',
      },
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
