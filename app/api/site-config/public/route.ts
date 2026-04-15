import { NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'
import { STOREFRONT_CMS_CONFIG_KEY } from '@/lib/siteConfigConstants'

export const runtime = 'nodejs'

let anonClient: SupabaseClient | null = null

function getSiteConfigClient(): SupabaseClient | null {
  if (isSupabaseConfigured()) {
    return getSupabaseAdmin()
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (!url || !anon) return null
  if (!anonClient) {
    anonClient = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return anonClient
}

/**
 * Public storefront CMS snapshot from server-side Supabase client.
 * This bypasses mobile browser CORS/RLS/cache quirks because fetch is same-origin.
 */
export async function GET() {
  const client = getSiteConfigClient()
  if (!client) {
    return NextResponse.json(
      { success: false, message: 'Supabase is not configured.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  try {
    const { data, error } = await client
      .from('site_configs')
      .select('value, updated_at')
      .eq('config_key', STOREFRONT_CMS_CONFIG_KEY)
      .maybeSingle()

    if (error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    const raw = data?.value && typeof data.value === 'object' ? (data.value as Record<string, unknown>) : null
    const inner = raw?.state
    const value =
      inner && typeof inner === 'object' && !Array.isArray(inner)
        ? (inner as Record<string, unknown>)
        : raw

    return NextResponse.json(
      {
        success: true,
        updatedAt: data?.updated_at || null,
        value: value || null,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (e) {
    return NextResponse.json(
      { success: false, message: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
