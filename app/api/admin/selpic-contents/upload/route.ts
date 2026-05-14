import { NextResponse } from 'next/server'
import { requireSupabaseAdminUser } from '@/lib/supabase/requireSupabaseAdmin'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'
import { SELPIC_CONTENTS_BUCKET } from '@/lib/selpicStorageBucket'

/** Align with typical Supabase object limits; Vercel body limits may apply first. */
const MAX_BYTES = 80 * 1024 * 1024

function isSafeObjectPath(p: string): boolean {
  if (!p || p.length > 600) return false
  if (p.includes('..') || p.startsWith('/') || p.includes('\\')) return false
  return /^[a-zA-Z0-9._/-]+$/.test(p)
}

export async function POST(req: Request) {
  const admin = await requireSupabaseAdminUser()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: 'Missing Supabase service role; set SUPABASE_SERVICE_ROLE_KEY for admin storage uploads.' },
      { status: 503 }
    )
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid multipart body' }, { status: 400 })
  }

  const path = String(formData.get('path') || '').trim()
  const file = formData.get('file')
  const contentTypeField = String(formData.get('contentType') || '').trim()

  if (!isSafeObjectPath(path)) {
    return NextResponse.json({ error: 'Invalid storage path' }, { status: 400 })
  }
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File too large' }, { status: 413 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const contentType =
    contentTypeField ||
    (typeof File !== 'undefined' && file instanceof File && file.type
      ? file.type
      : 'application/octet-stream')

  const supabase = getSupabaseAdmin()
  const { error } = await supabase.storage.from(SELPIC_CONTENTS_BUCKET).upload(path, buffer, {
    contentType,
    upsert: true,
  })
  if (error) {
    console.error('[admin/selpic-contents/upload]', error.message || error)
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 })
  }

  const { data } = supabase.storage.from(SELPIC_CONTENTS_BUCKET).getPublicUrl(path)
  return NextResponse.json({ publicUrl: data.publicUrl })
}
