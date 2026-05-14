export { SELPIC_CONTENTS_BUCKET } from '@/lib/selpicStorageBucket'

export function sanitizeStorageFileName(name: string): string {
  const base = name.split(/[/\\]/).pop() || 'file'
  return base.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120)
}

export function buildSelpicStoragePath(folder: string, fileId: string, fileName: string): string {
  const safeFolder = folder.replace(/[^a-zA-Z0-9._/-]/g, '_').replace(/^\/+|\/+$/g, '') || 'general'
  const safe = sanitizeStorageFileName(fileName)
  return `${safeFolder}/${fileId}-${safe}`
}

/**
 * Upload to Supabase Storage (public bucket) via server (service role).
 * Avoids browser RLS on `storage.objects` (see migration 005) and works with a normal admin cookie session.
 */
export async function uploadToSelpicContents(
  path: string,
  body: File | Blob,
  contentType?: string
): Promise<string> {
  if (typeof window === 'undefined') {
    throw new Error('uploadToSelpicContents is browser-only.')
  }

  const ct =
    contentType ||
    (body instanceof File && body.type ? body.type : 'application/octet-stream')

  const formData = new FormData()
  formData.set('path', path)
  formData.set('file', body)
  formData.set('contentType', ct)

  const res = await fetch('/api/admin/selpic-contents/upload', {
    method: 'POST',
    body: formData,
    credentials: 'same-origin',
  })

  const json = (await res.json().catch(() => ({}))) as { publicUrl?: string; error?: string }
  if (!res.ok) {
    throw new Error(json.error || res.statusText || 'Storage upload failed')
  }
  if (!json.publicUrl) {
    throw new Error('Storage upload failed: missing publicUrl')
  }
  return json.publicUrl
}
