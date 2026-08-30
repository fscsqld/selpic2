import { NextResponse } from 'next/server'

import { STOREFRONT_CMS_CONFIG_KEY } from '@/lib/siteConfigConstants'
import { parseSiteConfigWriteBody } from '@/lib/siteConfigWritePayload'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'
import { requireSystemAdminPermission } from '@/lib/supabase/requireAdminPermission'

export const runtime = 'nodejs'

const jsonHeaders = { 'Cache-Control': 'no-store' as const }

/**
 * Admin CMS write: service-role upsert of `storefront_cms`.
 * Browser clients must not upsert `site_configs` directly (RLS blocks anon).
 */
export async function PUT(req: Request) {
  const gate = await requireSystemAdminPermission()
  if (!gate.ok) {
    return NextResponse.json(
      {
        success: false,
        message:
          gate.status === 401
            ? 'Sign in with a Supabase admin email. Legacy local admin cannot save CMS to the cloud.'
            : 'Forbidden — system admin permission required to save CMS settings.',
      },
      { status: gate.status, headers: jsonHeaders }
    )
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { success: false, message: 'Supabase is not configured (service role key missing).' },
      { status: 500, headers: jsonHeaders }
    )
  }

  const body = await req.json().catch(() => null)
  const parsed = parseSiteConfigWriteBody(body)
  if (!parsed.ok) {
    return NextResponse.json({ success: false, message: parsed.message }, { status: 400, headers: jsonHeaders })
  }

  try {
    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('site_configs')
      .upsert(
        {
          config_key: STOREFRONT_CMS_CONFIG_KEY,
          value: parsed.value,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'config_key' }
      )
      .select('config_key')
      .maybeSingle()

    if (error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500, headers: jsonHeaders }
      )
    }

    if (!data?.config_key) {
      return NextResponse.json(
        { success: false, message: 'Save returned no row. Check site_configs exists.' },
        { status: 500, headers: jsonHeaders }
      )
    }

    return NextResponse.json(
      { success: true, configKey: data.config_key },
      { headers: jsonHeaders }
    )
  } catch (e) {
    return NextResponse.json(
      { success: false, message: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500, headers: jsonHeaders }
    )
  }
}
