import 'server-only'

import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'
import { SELPIC_CONTENTS_BUCKET } from '@/lib/selpicStorageBucket'
import { newFundraisingId } from '@/lib/fundraising/ids'
import type { FundraisingChangeRequestAttachment } from '@/lib/fundraising/types'

const PREFIX = 'fundraising/change-requests'
const MAX_FILES = 5
const MAX_BYTES = 8 * 1024 * 1024
const ALLOWED = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

function safeFileName(name: string): string {
  return String(name || 'file')
    .replace(/[^\w.\-()+ ]+/g, '_')
    .slice(0, 120)
}

export async function uploadChangeRequestAttachments(params: {
  partnerId: string
  requestId: string
  files: File[]
}): Promise<FundraisingChangeRequestAttachment[]> {
  if (!params.files.length) return []
  if (params.files.length > MAX_FILES) {
    throw new Error(`You can attach up to ${MAX_FILES} files.`)
  }
  if (!isSupabaseConfigured()) {
    throw new Error('File upload is not available yet. Please reply by email with attachments.')
  }

  const admin = getSupabaseAdmin()
  const out: FundraisingChangeRequestAttachment[] = []

  for (const file of params.files) {
    if (file.size <= 0) continue
    if (file.size > MAX_BYTES) {
      throw new Error(`“${file.name}” is too large (max 8 MB per file).`)
    }
    const type = file.type || 'application/octet-stream'
    if (!ALLOWED.has(type) && !/\.(pdf|jpe?g|png|webp|docx?)$/i.test(file.name)) {
      throw new Error(`“${file.name}” type is not allowed. Use PDF, JPG, PNG, or Word.`)
    }

    const id = newFundraisingId('fcra')
    const storagePath = `${PREFIX}/${params.partnerId}/${params.requestId}/${id}-${safeFileName(file.name)}`
    const buffer = Buffer.from(await file.arrayBuffer())
      const contentType =
        ALLOWED.has(type) || type.startsWith('image/')
          ? type
          : /\.pdf$/i.test(file.name)
            ? 'application/pdf'
            : /\.docx$/i.test(file.name)
              ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
              : /\.doc$/i.test(file.name)
                ? 'application/msword'
                : type
      const { error } = await admin.storage.from(SELPIC_CONTENTS_BUCKET).upload(storagePath, buffer, {
        contentType,
        upsert: false,
      })
      if (error) {
        const msg = error.message || 'Upload failed'
        if (/mime type|not supported/i.test(msg)) {
          throw new Error(
            `Could not upload “${file.name}”. Storage must allow PDF/image/Word. (${msg})`
          )
        }
        throw new Error(msg)
      }

    const { data } = admin.storage.from(SELPIC_CONTENTS_BUCKET).getPublicUrl(storagePath)
    out.push({
      id,
      fileName: safeFileName(file.name),
      contentType: type,
      size: file.size,
      storagePath,
      fileUrl: data.publicUrl,
      uploadedAt: new Date().toISOString(),
    })
  }

  return out
}
