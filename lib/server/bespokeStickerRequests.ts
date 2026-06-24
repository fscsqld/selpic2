import path from 'path'
import fs from 'fs/promises'

import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'
import { SELPIC_CONTENTS_BUCKET } from '@/lib/selpicStorageBucket'

export type BespokeStickerRequestStatus = 'new' | 'reviewed' | 'replied' | 'approved' | 'rejected'

export type BespokeStickerRequestRecord = {
  id: string
  createdAt: string
  status: BespokeStickerRequestStatus
  payload: Record<string, unknown>
  logo?: {
    fileUrl: string
    mimeType: string
    originalName: string
    size: number
  }
}

type BespokeStickerRequestRow = {
  id: string
  created_at: string
  status: BespokeStickerRequestStatus
  payload: Record<string, unknown> | null
  logo_file_url: string | null
  logo_mime_type: string | null
  logo_original_name: string | null
  logo_size: number | null
  logo_storage_path: string | null
}

const DATA_DIR = path.join(process.cwd(), 'data', 'bespoke-requests', 'stickers-custom')
const DATA_FILE = path.join(DATA_DIR, 'requests.json')

export const BESPOKE_STICKER_UPLOAD_DIR = path.join(
  process.cwd(),
  'public',
  'uploads',
  'bespoke-requests',
  'stickers-custom'
)

export const BESPOKE_STICKER_FILE_URL_BASE = '/uploads/bespoke-requests/stickers-custom'

const BESPOKE_STORAGE_PREFIX = 'bespoke-requests/stickers-custom'

function rowToRecord(row: BespokeStickerRequestRow): BespokeStickerRequestRecord {
  const record: BespokeStickerRequestRecord = {
    id: String(row.id),
    createdAt: row.created_at,
    status: row.status,
    payload: row.payload && typeof row.payload === 'object' ? row.payload : {},
  }
  if (row.logo_file_url) {
    record.logo = {
      fileUrl: row.logo_file_url,
      mimeType: row.logo_mime_type || '',
      originalName: row.logo_original_name || '',
      size: typeof row.logo_size === 'number' ? row.logo_size : 0,
    }
  }
  return record
}

export async function ensureBespokeDataDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true })
}

async function readBespokeStickerRequestsFromFile(): Promise<BespokeStickerRequestRecord[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf-8')
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as BespokeStickerRequestRecord[]
  } catch {
    return []
  }
}

async function writeBespokeStickerRequestsToFile(records: BespokeStickerRequestRecord[]): Promise<void> {
  await ensureBespokeDataDir()
  await fs.writeFile(DATA_FILE, JSON.stringify(records, null, 2), 'utf-8')
}

async function readBespokeStickerRequestsFromSupabase(): Promise<BespokeStickerRequestRecord[]> {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('bespoke_sticker_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) {
    throw new Error(error.message)
  }

  return (data || []).map((row) => rowToRecord(row as BespokeStickerRequestRow))
}

export async function readBespokeStickerRequests(): Promise<BespokeStickerRequestRecord[]> {
  if (isSupabaseConfigured()) {
    try {
      return await readBespokeStickerRequestsFromSupabase()
    } catch (err) {
      console.warn('[bespokeStickerRequests] Supabase read failed, falling back to file:', err)
    }
  }
  return readBespokeStickerRequestsFromFile()
}

export async function writeBespokeStickerRequests(records: BespokeStickerRequestRecord[]): Promise<void> {
  if (isSupabaseConfigured()) {
    throw new Error('Bulk write is not supported when Supabase is configured.')
  }
  await writeBespokeStickerRequestsToFile(records)
}

export function countBespokeStickerRequestsByStatus(
  records: BespokeStickerRequestRecord[],
  status: BespokeStickerRequestStatus
): number {
  return records.filter((r) => r.status === status).length
}

export async function insertBespokeStickerRequest(
  record: BespokeStickerRequestRecord,
  logoStoragePath?: string | null
): Promise<void> {
  if (isSupabaseConfigured()) {
    const admin = getSupabaseAdmin()
    const { error } = await admin.from('bespoke_sticker_requests').insert({
      id: record.id,
      created_at: record.createdAt,
      status: record.status,
      payload: record.payload,
      logo_file_url: record.logo?.fileUrl ?? null,
      logo_mime_type: record.logo?.mimeType ?? null,
      logo_original_name: record.logo?.originalName ?? null,
      logo_size: record.logo?.size ?? null,
      logo_storage_path: logoStoragePath ?? null,
    })
    if (error) {
      throw new Error(error.message)
    }
    return
  }

  const records = await readBespokeStickerRequestsFromFile()
  records.unshift(record)
  await writeBespokeStickerRequestsToFile(records)
}

export async function updateBespokeStickerRequestStatus(
  id: string,
  status: BespokeStickerRequestStatus
): Promise<BespokeStickerRequestRecord> {
  if (isSupabaseConfigured()) {
    const admin = getSupabaseAdmin()
    const update: Record<string, unknown> = { status }
    if (status === 'replied') {
      update.replied_at = new Date().toISOString()
    }
    const { data, error } = await admin
      .from('bespoke_sticker_requests')
      .update(update)
      .eq('id', id)
      .select('*')
      .single()

    if (error || !data) {
      throw new Error(error?.message || 'Request not found')
    }
    return rowToRecord(data as BespokeStickerRequestRow)
  }

  const records = await readBespokeStickerRequestsFromFile()
  const idx = records.findIndex((r) => r.id === id)
  if (idx < 0) {
    throw new Error('Request not found')
  }
  records[idx] = { ...records[idx], status }
  await writeBespokeStickerRequestsToFile(records)
  return records[idx]
}

function resolvePublicUploadPath(fileUrl: string): string | null {
  const marker = '/uploads/'
  const idx = fileUrl.indexOf(marker)
  if (idx < 0) return null
  const rel = fileUrl.slice(idx + marker.length)
  if (!rel) return null
  return path.join(process.cwd(), 'public', 'uploads', rel)
}

async function unlinkIfExists(filePath: string) {
  try {
    await fs.unlink(filePath)
  } catch {
    // ignore
  }
}

async function deleteBespokeLogoAssets(
  logoFileUrl: string | null | undefined,
  logoStoragePath: string | null | undefined
) {
  if (logoStoragePath && isSupabaseConfigured()) {
    try {
      const admin = getSupabaseAdmin()
      await admin.storage.from(SELPIC_CONTENTS_BUCKET).remove([logoStoragePath])
    } catch {
      // ignore
    }
  }

  if (logoFileUrl) {
    const filePath = resolvePublicUploadPath(logoFileUrl)
    if (filePath) {
      await unlinkIfExists(filePath)
    }
  }
}

export async function deleteBespokeStickerRequest(id: string): Promise<void> {
  if (isSupabaseConfigured()) {
    const admin = getSupabaseAdmin()
    const { data, error: fetchError } = await admin
      .from('bespoke_sticker_requests')
      .select('logo_file_url, logo_storage_path')
      .eq('id', id)
      .maybeSingle()

    if (fetchError) {
      throw new Error(fetchError.message)
    }
    if (!data) {
      throw new Error('Request not found')
    }

    await deleteBespokeLogoAssets(data.logo_file_url, data.logo_storage_path)

    const { error } = await admin.from('bespoke_sticker_requests').delete().eq('id', id)
    if (error) {
      throw new Error(error.message)
    }
    return
  }

  const records = await readBespokeStickerRequestsFromFile()
  const idx = records.findIndex((r) => r.id === id)
  if (idx < 0) {
    throw new Error('Request not found')
  }

  const record = records[idx]
  if (record.logo?.fileUrl) {
    const filePath = resolvePublicUploadPath(record.logo.fileUrl)
    if (filePath) {
      await unlinkIfExists(filePath)
    }
  }

  records.splice(idx, 1)
  try {
    await writeBespokeStickerRequestsToFile(records)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to persist delete'
    throw new Error(
      message.includes('EROFS') || message.includes('read-only')
        ? 'Delete is not supported on this server without Supabase. Run docs/bespoke-sticker-requests-supabase.sql in Supabase.'
        : message
    )
  }
}

export async function uploadBespokeLogoToStorage(params: {
  filename: string
  buffer: Buffer
  mimeType: string
}): Promise<{ fileUrl: string; storagePath: string }> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured for logo upload.')
  }

  const storagePath = `${BESPOKE_STORAGE_PREFIX}/${params.filename}`
  const admin = getSupabaseAdmin()
  const { error } = await admin.storage.from(SELPIC_CONTENTS_BUCKET).upload(storagePath, params.buffer, {
    contentType: params.mimeType,
    upsert: true,
  })
  if (error) {
    throw new Error(error.message)
  }

  const { data } = admin.storage.from(SELPIC_CONTENTS_BUCKET).getPublicUrl(storagePath)
  return { fileUrl: data.publicUrl, storagePath }
}
