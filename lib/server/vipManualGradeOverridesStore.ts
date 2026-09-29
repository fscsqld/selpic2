import 'server-only'

import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'
import { VIP_MANUAL_GRADE_OVERRIDES_CONFIG_KEY } from '@/lib/siteConfigConstants'
import {
  normalizeVipOverrideEmail,
  parseVipManualGradeOverridesValue,
  type VipManualGradeOverride,
  type VipManualGradeOverridesSnapshot,
} from '@/lib/vipManualGradeOverride'

async function readSnapshot(): Promise<VipManualGradeOverridesSnapshot> {
  const empty: VipManualGradeOverridesSnapshot = { updatedAt: '', byEmail: {} }
  if (!isSupabaseConfigured()) return empty
  try {
    const sb = getSupabaseAdmin()
    const { data, error } = await sb
      .from('site_configs')
      .select('value')
      .eq('config_key', VIP_MANUAL_GRADE_OVERRIDES_CONFIG_KEY)
      .maybeSingle()
    if (error || !data) return empty
    return parseVipManualGradeOverridesValue(data.value)
  } catch {
    return empty
  }
}

async function writeSnapshot(snapshot: VipManualGradeOverridesSnapshot): Promise<boolean> {
  if (!isSupabaseConfigured()) return false
  try {
    const sb = getSupabaseAdmin()
    const now = new Date().toISOString()
    const { error } = await sb.from('site_configs').upsert(
      {
        config_key: VIP_MANUAL_GRADE_OVERRIDES_CONFIG_KEY,
        value: { ...snapshot, updatedAt: now },
        updated_at: now,
      },
      { onConflict: 'config_key' }
    )
    return !error
  } catch {
    return false
  }
}

export async function getVipManualGradeOverrideForEmail(
  email: string
): Promise<VipManualGradeOverride | null> {
  const key = normalizeVipOverrideEmail(email)
  if (!key) return null
  const snap = await readSnapshot()
  return snap.byEmail[key] || null
}

export async function upsertVipManualGradeOverride(args: {
  email: string
  gradeCode: number
  reason?: string
}): Promise<{ ok: true; override: VipManualGradeOverride } | { ok: false; error: string }> {
  const email = normalizeVipOverrideEmail(args.email)
  if (!email) return { ok: false, error: 'Email is required.' }
  if (!Number.isFinite(args.gradeCode) || args.gradeCode < 0 || args.gradeCode > 4) {
    return { ok: false, error: 'gradeCode must be 0–4.' }
  }
  const snap = await readSnapshot()
  const override: VipManualGradeOverride = {
    email,
    gradeCode: Math.floor(args.gradeCode),
    reason: args.reason?.trim() || undefined,
    updatedAt: new Date().toISOString(),
  }
  snap.byEmail[email] = override
  const ok = await writeSnapshot(snap)
  if (!ok) return { ok: false, error: 'Could not save VIP grade override.' }
  return { ok: true, override }
}

export async function clearVipManualGradeOverride(
  email: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const key = normalizeVipOverrideEmail(email)
  if (!key) return { ok: false, error: 'Email is required.' }
  const snap = await readSnapshot()
  if (!snap.byEmail[key]) return { ok: true }
  delete snap.byEmail[key]
  const ok = await writeSnapshot(snap)
  if (!ok) return { ok: false, error: 'Could not clear VIP grade override.' }
  return { ok: true }
}
