import 'server-only'

import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'

export type EtsyConnectionRow = {
  shop_id: string
  shop_name: string | null
  etsy_user_id: string | null
  access_token: string
  refresh_token: string
  expires_at: string
}

export type EtsyConnectionInput = {
  shop_id: string
  shop_name?: string | null
  etsy_user_id?: string | null
  access_token: string
  refresh_token: string
  expires_at: string
}

export async function getEtsyConnection(): Promise<EtsyConnectionRow | null> {
  if (!isSupabaseConfigured()) return null
  const sb = getSupabaseAdmin()
  const preferred = process.env.ETSY_SHOP_ID?.trim()
  if (preferred) {
    const { data, error } = await sb.from('etsy_oauth_connection').select('*').eq('shop_id', preferred).maybeSingle()
    if (!error && data) return data as EtsyConnectionRow
  }
  const { data, error } = await sb.from('etsy_oauth_connection').select('*').order('updated_at', { ascending: false }).limit(1).maybeSingle()
  if (error || !data) return null
  return data as EtsyConnectionRow
}

export async function upsertEtsyConnection(row: EtsyConnectionInput): Promise<void> {
  const sb = getSupabaseAdmin()
  const now = new Date().toISOString()
  const { data: existing } = await sb.from('etsy_oauth_connection').select('shop_id').eq('shop_id', row.shop_id).maybeSingle()
  const payload = {
    shop_id: row.shop_id,
    shop_name: row.shop_name ?? null,
    etsy_user_id: row.etsy_user_id ?? null,
    access_token: row.access_token,
    refresh_token: row.refresh_token,
    expires_at: row.expires_at,
    updated_at: now,
  }
  if (existing?.shop_id) {
    const { error } = await sb.from('etsy_oauth_connection').update(payload).eq('shop_id', row.shop_id)
    if (error) throw new Error(error.message)
    return
  }
  const { error } = await sb.from('etsy_oauth_connection').insert({ ...payload, created_at: now })
  if (error) throw new Error(error.message)
}
