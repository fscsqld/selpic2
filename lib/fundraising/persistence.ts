import 'server-only'

import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'
import type {
  FundraisingDocument,
  FundraisingPartner,
  FundraisingSettlement,
  FundraisingSettings,
} from '@/lib/fundraising/types'
import { DEFAULT_FUNDRAISING_SETTINGS } from '@/lib/fundraising/types'

function nowIso() {
  return new Date().toISOString()
}

export async function upsertFundraisingPartnerRow(partner: FundraisingPartner): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: 'Supabase not configured' }
  try {
    const admin = getSupabaseAdmin()
    const { error } = await admin.from('fundraising_partners').upsert({
      id: partner.id,
      payload: partner,
      updated_at: nowIso(),
    })
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'upsert partner failed' }
  }
}

export async function upsertFundraisingDocumentRow(doc: FundraisingDocument): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: 'Supabase not configured' }
  try {
    const admin = getSupabaseAdmin()
    const { error } = await admin.from('fundraising_documents').upsert({
      id: doc.id,
      partner_id: doc.partnerId || null,
      doc_type: doc.type,
      payload: doc,
      updated_at: nowIso(),
    })
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'upsert document failed' }
  }
}

export async function upsertFundraisingSettlementRow(settlement: FundraisingSettlement): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: 'Supabase not configured' }
  try {
    const admin = getSupabaseAdmin()
    const { error } = await admin.from('fundraising_settlements').upsert({
      id: settlement.id,
      partner_id: settlement.partnerId,
      period: settlement.period,
      payload: settlement,
      updated_at: nowIso(),
    })
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'upsert settlement failed' }
  }
}

export async function listFundraisingPartnersFromDb(): Promise<FundraisingPartner[]> {
  if (!isSupabaseConfigured()) return []
  const admin = getSupabaseAdmin()
  const { data, error } = await admin.from('fundraising_partners').select('payload').order('updated_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data || []).map((r) => r.payload as FundraisingPartner).filter(Boolean)
}

export async function listFundraisingDocumentsFromDb(): Promise<FundraisingDocument[]> {
  if (!isSupabaseConfigured()) return []
  const admin = getSupabaseAdmin()
  const { data, error } = await admin.from('fundraising_documents').select('payload').order('updated_at', { ascending: false }).limit(500)
  if (error) throw new Error(error.message)
  return (data || []).map((r) => r.payload as FundraisingDocument).filter(Boolean)
}

export async function listFundraisingSettlementsFromDb(): Promise<FundraisingSettlement[]> {
  if (!isSupabaseConfigured()) return []
  const admin = getSupabaseAdmin()
  const { data, error } = await admin.from('fundraising_settlements').select('payload').order('updated_at', { ascending: false }).limit(500)
  if (error) throw new Error(error.message)
  return (data || []).map((r) => r.payload as FundraisingSettlement).filter(Boolean)
}

export async function loadFundraisingSettingsFromDb(): Promise<FundraisingSettings> {
  if (!isSupabaseConfigured()) return DEFAULT_FUNDRAISING_SETTINGS
  const admin = getSupabaseAdmin()
  const { data, error } = await admin.from('fundraising_settings').select('value').eq('id', 'global').maybeSingle()
  if (error || !data?.value) return DEFAULT_FUNDRAISING_SETTINGS
  return { ...DEFAULT_FUNDRAISING_SETTINGS, ...(data.value as Partial<FundraisingSettings>) }
}

export async function saveFundraisingSettingsToDb(settings: FundraisingSettings): Promise<void> {
  if (!isSupabaseConfigured()) return
  const admin = getSupabaseAdmin()
  await admin.from('fundraising_settings').upsert({
    id: 'global',
    value: settings,
    updated_at: nowIso(),
  })
}

export { newFundraisingId, newPartnerId } from '@/lib/fundraising/ids'
