import { NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'
import { STOREFRONT_CMS_CONFIG_KEY } from '@/lib/siteConfigConstants'
import { unwrapSiteConfigValue } from '@/lib/siteConfigWritePayload'
import {
  PUBLIC_SITE_CONFIG_CACHE_CONTROL,
  PUBLIC_SITE_CONFIG_NO_STORE,
} from '@/lib/publicSiteConfigCache'

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
 * Short CDN cache (60s) + SWR — admin edits appear within ~60–300s on storefront.
 */
export async function GET() {
  const client = getSiteConfigClient()
  if (!client) {
    return NextResponse.json(
      { success: false, message: 'Supabase is not configured.' },
      { status: 500, headers: { 'Cache-Control': PUBLIC_SITE_CONFIG_NO_STORE } }
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
        { status: 500, headers: { 'Cache-Control': PUBLIC_SITE_CONFIG_NO_STORE } }
      )
    }

    const normalizedValue = unwrapSiteConfigValue(data?.value) ?? {}

    return NextResponse.json(
      {
        success: true,
        updatedAt: data?.updated_at || null,
        value: normalizedValue,
      },
      { headers: { 'Cache-Control': PUBLIC_SITE_CONFIG_CACHE_CONTROL } }
    )
  } catch (e) {
    return NextResponse.json(
      { success: false, message: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500, headers: { 'Cache-Control': PUBLIC_SITE_CONFIG_NO_STORE } }
    )
  }
}
