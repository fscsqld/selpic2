import path from 'path'
import fs from 'fs/promises'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'
import { STOREFRONT_MEDIA_CONFIG_KEY } from '@/lib/siteConfigConstants'
import type { MediaSyncRecord } from '@/lib/mediaSync'

export type MediaSnapshot = {
  updatedAt: string
  mediaFiles: MediaSyncRecord[]
}

const DATA_DIR = path.join(process.cwd(), 'data', 'media')
const DATA_FILE = path.join(DATA_DIR, 'products.json')

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true })
}

export async function readMediaSnapshot(): Promise<MediaSnapshot> {
  if (isSupabaseConfigured()) {
    try {
      const client = getSupabaseAdmin()
      const { data, error } = await client
        .from('site_configs')
        .select('value, updated_at')
        .eq('config_key', STOREFRONT_MEDIA_CONFIG_KEY)
        .maybeSingle()
      if (!error && data) {
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
      }
    } catch {
      // fall through to file fallback
    }
  }
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf-8')
    const parsed = JSON.parse(raw) as MediaSnapshot | MediaSyncRecord[]
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && Array.isArray(parsed.mediaFiles)) {
      return { updatedAt: parsed.updatedAt || '', mediaFiles: parsed.mediaFiles }
    }
    if (Array.isArray(parsed)) {
      return { updatedAt: '', mediaFiles: parsed }
    }
  } catch {
    // ignore
  }
  return { updatedAt: '', mediaFiles: [] }
}

export async function writeMediaSnapshot(snapshot: MediaSnapshot): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
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
      if (!error) return
      console.error('[mediaStore] Supabase upsert storefront_media failed:', error.message || error)
      // Fall back to local file for environments where DB write is blocked.
    } catch (e) {
      console.error('[mediaStore] Supabase write exception:', e)
      // Fall back to local file.
    }
  }
  await ensureDir()
  await fs.writeFile(DATA_FILE, JSON.stringify(snapshot, null, 2), 'utf-8')
}
