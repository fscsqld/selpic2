import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

/** Must match the public bucket name in Supabase Storage. */
export const SELPIC_CONTENTS_BUCKET = 'selpic-contents'

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
 * Upload to Supabase Storage (public bucket) and return the public URL for use in site_configs / content items.
 * Requires an authenticated Supabase session if bucket policies require auth.
 */
export async function uploadToSelpicContents(
  path: string,
  body: File | Blob,
  contentType?: string
): Promise<string> {
  const supabase = createSupabaseBrowserClient()
  const ct =
    contentType || (body instanceof File && body.type ? body.type : 'application/octet-stream')

  const { error } = await supabase.storage.from(SELPIC_CONTENTS_BUCKET).upload(path, body, {
    contentType: ct,
    upsert: true,
  })

  if (error) {
    throw new Error(error.message || 'Storage upload failed')
  }

  const { data } = supabase.storage.from(SELPIC_CONTENTS_BUCKET).getPublicUrl(path)
  return data.publicUrl
}
