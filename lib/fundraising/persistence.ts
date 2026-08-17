import 'server-only'

import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'
import type {
  FundraisingChangeRequest,
  FundraisingDocument,
  FundraisingGrantAccountEvent,
  FundraisingPartner,
  FundraisingSettlement,
  FundraisingSettings,
} from '@/lib/fundraising/types'
import { DEFAULT_FUNDRAISING_SETTINGS, FUNDRAISING_CHANGE_REQUEST_OPEN_STATUSES } from '@/lib/fundraising/types'

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

/** Delete partner and related documents / settlements / lookup OTP+sessions / grant-account events. */
export async function deleteFundraisingPartnerAndRelated(
  partnerId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: 'Supabase not configured' }
  try {
    const admin = getSupabaseAdmin()
    const { data: partnerRow } = await admin
      .from('fundraising_partners')
      .select('payload')
      .eq('id', partnerId)
      .maybeSingle()
    const lookupToken = String((partnerRow?.payload as FundraisingPartner | undefined)?.lookupToken || '')

    await admin.from('fundraising_documents').delete().eq('partner_id', partnerId)
    await admin.from('fundraising_settlements').delete().eq('partner_id', partnerId)
    await admin.from('fundraising_grant_account_events').delete().eq('partner_id', partnerId)
    await admin.from('fundraising_change_requests').delete().eq('partner_id', partnerId)
    if (lookupToken) {
      await admin.from('fundraising_lookup_otps').delete().eq('lookup_token', lookupToken)
      await admin.from('fundraising_lookup_sessions').delete().eq('lookup_token', lookupToken)
    }
    await admin.from('fundraising_lookup_sessions').delete().eq('partner_id', partnerId)
    const { error } = await admin.from('fundraising_partners').delete().eq('id', partnerId)
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'delete partner failed' }
  }
}

export async function insertFundraisingGrantAccountEvent(
  event: FundraisingGrantAccountEvent
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: 'Supabase not configured' }
  try {
    const admin = getSupabaseAdmin()
    const { error } = await admin.from('fundraising_grant_account_events').insert({
      id: event.id,
      partner_id: event.partnerId,
      payload: event,
      created_at: event.changedAt,
    })
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'insert grant account event failed' }
  }
}

export async function listFundraisingGrantAccountEventsFromDb(): Promise<FundraisingGrantAccountEvent[]> {
  if (!isSupabaseConfigured()) return []
  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('fundraising_grant_account_events')
    .select('payload')
    .order('created_at', { ascending: false })
    .limit(500)
  if (error || !data) return []
  return data.map((r) => r.payload as FundraisingGrantAccountEvent).filter(Boolean)
}

export async function upsertFundraisingChangeRequest(
  request: FundraisingChangeRequest
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: 'Supabase not configured' }
  try {
    const admin = getSupabaseAdmin()
    const { error } = await admin.from('fundraising_change_requests').upsert({
      id: request.id,
      partner_id: request.partnerId,
      status: request.status,
      payload: request,
      created_at: request.createdAt,
      updated_at: request.updatedAt || nowIso(),
    })
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'upsert change request failed' }
  }
}

export async function listFundraisingChangeRequestsFromDb(opts?: {
  partnerId?: string
  openOnly?: boolean
  limit?: number
}): Promise<FundraisingChangeRequest[]> {
  if (!isSupabaseConfigured()) return []
  const admin = getSupabaseAdmin()
  let q = admin.from('fundraising_change_requests').select('payload,status').order('updated_at', { ascending: false })
  if (opts?.partnerId) q = q.eq('partner_id', opts.partnerId)
  if (opts?.openOnly) q = q.in('status', [...FUNDRAISING_CHANGE_REQUEST_OPEN_STATUSES])
  const { data, error } = await q.limit(opts?.limit ?? 300)
  if (error || !data) return []
  return data.map((r) => r.payload as FundraisingChangeRequest).filter(Boolean)
}

export async function getFundraisingChangeRequestById(
  id: string
): Promise<FundraisingChangeRequest | null> {
  if (!isSupabaseConfigured()) return null
  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('fundraising_change_requests')
    .select('payload')
    .eq('id', id)
    .maybeSingle()
  if (error || !data?.payload) return null
  return data.payload as FundraisingChangeRequest
}

export { newFundraisingId, newPartnerId } from '@/lib/fundraising/ids'
