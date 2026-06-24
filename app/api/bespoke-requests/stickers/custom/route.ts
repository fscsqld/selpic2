import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs/promises'
import { randomUUID } from 'crypto'
import { requireSupabaseAdminUser } from '@/lib/supabase/requireSupabaseAdmin'
import { notifyAdminsOfBespokeRequest } from '@/lib/server/adminInboundNotify'
import {
  BESPOKE_STICKER_FILE_URL_BASE,
  BESPOKE_STICKER_UPLOAD_DIR,
  type BespokeStickerRequestRecord,
  readBespokeStickerRequests,
  writeBespokeStickerRequests,
} from '@/lib/server/bespokeStickerRequests'

async function ensureDir(dirPath: string) {
  await fs.mkdir(dirPath, { recursive: true })
}

export async function GET() {
  const admin = await requireSupabaseAdminUser()
  if (!admin) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  const records = await readBespokeStickerRequests()
  records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  return NextResponse.json({ records })
}

export async function POST(req: Request) {
  const form = await req.formData()
  const payloadRaw = form.get('payload')
  if (typeof payloadRaw !== 'string' || payloadRaw.trim() === '') {
    return NextResponse.json({ success: false, message: 'Missing payload' }, { status: 400 })
  }

  let payload: Record<string, unknown> | null = null
  try {
    payload = JSON.parse(payloadRaw) as Record<string, unknown>
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid payload JSON' }, { status: 400 })
  }

  const logo = form.get('logoFile')
  let logoMeta: BespokeStickerRequestRecord['logo'] | undefined = undefined

  if (logo) {
    const maybeFile = logo as File & { arrayBuffer?: () => Promise<ArrayBuffer> }
    const isFileLike = typeof maybeFile?.arrayBuffer === 'function'

    if (!isFileLike) {
      return NextResponse.json({ success: false, message: 'Invalid logo file' }, { status: 400 })
    }

    const mimeType: string = maybeFile.type
    const allowed = ['image/png', 'image/svg+xml']
    if (!allowed.includes(mimeType)) {
      return NextResponse.json({ success: false, message: 'Only PNG or SVG files are allowed.' }, { status: 400 })
    }

    const size: number = typeof maybeFile.size === 'number' ? maybeFile.size : 0
    const maxBytes = 10 * 1024 * 1024
    if (size > maxBytes) {
      return NextResponse.json({ success: false, message: 'File is too large. Max size is 10MB.' }, { status: 400 })
    }

    const fileId = randomUUID()
    const ext = mimeType === 'image/svg+xml' ? '.svg' : '.png'
    const filename = `${fileId}${ext}`

    const uploadPath = path.join(BESPOKE_STICKER_UPLOAD_DIR, filename)
    await ensureDir(BESPOKE_STICKER_UPLOAD_DIR)

    const arrayBuffer = await maybeFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    await fs.writeFile(uploadPath, buffer)

    logoMeta = {
      fileUrl: `${BESPOKE_STICKER_FILE_URL_BASE}/${filename}`,
      mimeType,
      originalName: typeof maybeFile?.name === 'string' ? maybeFile.name : filename,
      size,
    }
  }

  const requestId = randomUUID()
  const record: BespokeStickerRequestRecord = {
    id: requestId,
    createdAt: new Date().toISOString(),
    status: 'new',
    payload,
    logo: logoMeta,
  }

  const records = await readBespokeStickerRequests()
  records.unshift(record)
  await writeBespokeStickerRequests(records)

  const contact = (payload?.contact || {}) as { name?: string; email?: string }
  const roll = (payload?.roll || {}) as { preset?: string; variant?: string }
  void notifyAdminsOfBespokeRequest({
    id: record.id,
    contactName: contact.name,
    contactEmail: contact.email,
    rollPreset: roll.variant || roll.preset,
  })

  return NextResponse.json({ success: true, id: record.id })
}
