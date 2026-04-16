import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'
import { STOREFRONT_MEDIA_CONFIG_KEY } from '@/lib/siteConfigConstants'
import type { MediaSyncRecord } from '@/lib/mediaSync'

export type MediaSnapshot = {
  updatedAt: string
  mediaFiles: MediaSyncRecord[]
}

export async function readMediaSnapshot(): Promise<MediaSnapshot> {
  if (!isSupabaseConfigured()) {
    return { updatedAt: '', mediaFiles: [] }
  }
  try {
    const client = getSupabaseAdmin()
    const { data, error } = await client
      .from('site_configs')
      .select('value, updated_at')
      .eq('config_key', STOREFRONT_MEDIA_CONFIG_KEY)
      .maybeSingle()
    if (error || !data) return { updatedAt: '', mediaFiles: [] }
    const value = data.value
    let normalized: unknown = value
    if (typeof value === 'string') {
      try {
        normalized = JSON.parse(value)
      } catch {
        normalized = null
      }
    }
    if (normalized && typeof normalized === 'object' && !Array.isArray(normalized)) {
      const obj = normalized as Record<string, unknown>
      return {
        updatedAt:
          (typeof obj.updatedAt === 'string' ? obj.updatedAt : '') ||
          (typeof data.updated_at === 'string' ? data.updated_at : ''),
        mediaFiles: Array.isArray(obj.mediaFiles) ? (obj.mediaFiles as MediaSyncRecord[]) : [],
      }
    }
    if (Array.isArray(normalized)) {
      return {
        updatedAt: typeof data.updated_at === 'string' ? data.updated_at : '',
        mediaFiles: normalized as MediaSyncRecord[],
      }
    }
    return { updatedAt: '', mediaFiles: [] }
  } catch {
    return { updatedAt: '', mediaFiles: [] }
  }
}

export async function writeMediaSnapshot(snapshot: MediaSnapshot): Promise<void> {
  if (!isSupabaseConfigured()) return
  const client = getSupabaseAdmin()
  const now = new Date().toISOString()
  const { error } = await client.from('site_configs').upsert(
    {
      config_key: STOREFRONT_MEDIA_CONFIG_KEY,
      value: {
        updatedAt: snapshot.updatedAt || now,
        mediaFiles: snapshot.mediaFiles,
      },
      updated_at: now,
    },
    { onConflict: 'config_key' }
  )
  if (error) {
    throw new Error(`[media] Supabase upsert failed: ${error.message}`)
  }
}
