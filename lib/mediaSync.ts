import type { MediaFile } from '@/lib/mediaStore'

export type MediaSyncRecord = {
  id: string
  name: string
  type: 'image' | 'video' | 'document'
  url: string
  size: number
  uploadedAt: string
  category: string
  productId?: string
  productName?: string
  tags: string[]
  description?: string
  order?: number
  webpUrl?: string
  usage?: string
  mediaType?: string
  thumbnailUrl?: string
  fallbackImageUrl?: string
}

function normalizeUploadedAt(value: Date | string | undefined): string {
  if (typeof value === 'string') return value
  if (value instanceof Date) return value.toISOString()
  return new Date().toISOString()
}

export function mediaFilesToSyncRecords(files: MediaFile[]): MediaSyncRecord[] {
  return files.map((f) => ({
    id: f.id,
    name: f.name,
    type: f.type,
    url: f.url,
    size: typeof f.size === 'number' ? f.size : 0,
    uploadedAt: normalizeUploadedAt(f.uploadedAt),
    category: f.category || 'general',
    productId: f.productId ? String(f.productId) : undefined,
    productName: f.productName,
    tags: Array.isArray(f.tags) ? f.tags : [],
    description: f.description,
    order: typeof f.order === 'number' ? f.order : undefined,
    webpUrl: f.webpUrl,
    usage: f.usage,
    mediaType: f.mediaType,
    thumbnailUrl: f.thumbnailUrl,
    fallbackImageUrl: f.fallbackImageUrl,
  }))
}

export async function syncMediaToServer(files: MediaFile[]): Promise<{ ok: boolean; status?: number }> {
  const secret = (process.env.NEXT_PUBLIC_CATALOG_SYNC_SECRET || '').trim()
  const payload = mediaFilesToSyncRecords(files)
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-selpic-admin-write': '1',
    }
    if (secret) headers.Authorization = `Bearer ${secret}`

    const res = await fetch('/api/media/products', {
      method: 'POST',
      headers,
      cache: 'no-store',
      body: JSON.stringify({ mediaFiles: payload }),
    })
    if (!res.ok) return { ok: false, status: res.status }
    return { ok: true, status: res.status }
  } catch {
    return { ok: false }
  }
}
