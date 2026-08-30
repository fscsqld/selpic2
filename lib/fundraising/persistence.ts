import 'server-only'

import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'
import type {
  FundraisingChangeRequest,
  FundraisingDocument,
  FundraisingGrantAccountEvent,
  FundraisingOutreachTarget,
  FundraisingOutreachTargetStatus,
  FundraisingPartner,
  FundraisingSettlement,
  FundraisingSettings,
} from '@/lib/fundraising/types'
import { DEFAULT_FUNDRAISING_SETTINGS, FUNDRAISING_CHANGE_REQUEST_OPEN_STATUSES } from '@/lib/fundraising/types'
import { healFundraisingDocument } from '@/lib/fundraising/partnerFacingSite'

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
    const healed = healFundraisingDocument(doc)
    const { error } = await admin.from('fundraising_documents').upsert({
      id: healed.id,
      partner_id: healed.partnerId || null,
      doc_type: healed.type,
      payload: healed,
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
  return (data || [])
    .map((r) => r.payload as FundraisingDocument)
    .filter(Boolean)
    .map((doc) => healFundraisingDocument(doc))
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

function mapOutreachTargetRow(row: {
  id: string
  organization_name?: string | null
  contact_email?: string | null
  contact_name?: string | null
  org_type?: string | null
  state?: string | null
  status?: string | null
  last_sent_at?: string | null
  last_error?: string | null
  converted_partner_id?: string | null
  payload?: Record<string, unknown> | null
  created_at?: string | null
  updated_at?: string | null
}): FundraisingOutreachTarget {
  return {
    id: row.id,
    organizationName: String(row.organization_name || ''),
    contactEmail: row.contact_email || undefined,
    contactName: row.contact_name || undefined,
    orgType: row.org_type || undefined,
    state: row.state || undefined,
    status: (row.status || 'PENDING') as FundraisingOutreachTargetStatus,
    lastSentAt: row.last_sent_at || undefined,
    lastError: row.last_error || undefined,
    convertedPartnerId: row.converted_partner_id || undefined,
    payload: (row.payload as Record<string, unknown>) || {},
    createdAt: row.created_at || nowIso(),
    updatedAt: row.updated_at || nowIso(),
  }
}

export async function getFundraisingOutreachTargetById(
  id: string
): Promise<FundraisingOutreachTarget | null> {
  if (!isSupabaseConfigured() || !id) return null
  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('fundraising_outreach_targets')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error || !data) return null
  return mapOutreachTargetRow(data as Parameters<typeof mapOutreachTargetRow>[0])
}

/**
 * Mark an outreach target CONVERTED when apply succeeds with target_id.
 * Idempotent: already-CONVERTED rows keep status; partner id fills only if empty.
 * Missing target / Supabase off → soft no-op (apply must still succeed).
 */
export async function markFundraisingOutreachTargetConverted(opts: {
  targetId: string
  partnerId: string
}): Promise<{ ok: true; skipped?: boolean } | { ok: false; error: string }> {
  const targetId = String(opts.targetId || '').trim()
  const partnerId = String(opts.partnerId || '').trim()
  if (!targetId || !partnerId) return { ok: true, skipped: true }
  if (!isSupabaseConfigured()) return { ok: true, skipped: true }

  try {
    const admin = getSupabaseAdmin()
    const { data: existing, error: readErr } = await admin
      .from('fundraising_outreach_targets')
      .select('id,status,converted_partner_id')
      .eq('id', targetId)
      .maybeSingle()

    if (readErr) return { ok: false, error: readErr.message }
    if (!existing) return { ok: true, skipped: true }

    const convertedPartnerId =
      String(existing.converted_partner_id || '').trim() || partnerId
    const updatedAt = nowIso()

    const { error: writeErr } = await admin
      .from('fundraising_outreach_targets')
      .update({
        status: 'CONVERTED',
        converted_partner_id: convertedPartnerId,
        last_error: null,
        updated_at: updatedAt,
      })
      .eq('id', targetId)

    if (writeErr) return { ok: false, error: writeErr.message }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'mark converted failed' }
  }
}

export async function listFundraisingOutreachTargetsFromDb(opts?: {
  status?: FundraisingOutreachTargetStatus
  limit?: number
}): Promise<FundraisingOutreachTarget[]> {
  if (!isSupabaseConfigured()) return []
  const admin = getSupabaseAdmin()
  let q = admin
    .from('fundraising_outreach_targets')
    .select('*')
    .order('updated_at', { ascending: false })
  if (opts?.status) q = q.eq('status', opts.status)
  const { data, error } = await q.limit(opts?.limit ?? 200)
  if (error || !data) return []
  return data.map((r) => mapOutreachTargetRow(r as Parameters<typeof mapOutreachTargetRow>[0]))
}

export async function upsertFundraisingOutreachTarget(
  target: FundraisingOutreachTarget
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: 'Supabase not configured' }
  const id = String(target.id || '').trim()
  if (!id) return { ok: false, error: 'Target id required' }
  try {
    const admin = getSupabaseAdmin()
    const updatedAt = nowIso()
    const { error } = await admin.from('fundraising_outreach_targets').upsert({
      id,
      organization_name: String(target.organizationName || '').trim(),
      contact_email: target.contactEmail?.trim().toLowerCase() || null,
      contact_name: target.contactName?.trim() || null,
      org_type: target.orgType?.trim() || null,
      state: target.state?.trim() || null,
      status: target.status || 'PENDING',
      last_sent_at: target.lastSentAt || null,
      last_error: target.lastError || null,
      converted_partner_id: target.convertedPartnerId || null,
      payload: target.payload || {},
      created_at: target.createdAt || updatedAt,
      updated_at: updatedAt,
    })
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'upsert outreach target failed' }
  }
}

export { newFundraisingId, newPartnerId } from '@/lib/fundraising/ids'
