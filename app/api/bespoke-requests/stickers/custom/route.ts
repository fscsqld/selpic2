import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs/promises'
import { randomUUID } from 'crypto'
import { requireSupabaseAdminUser } from '@/lib/supabase/requireSupabaseAdmin'
import { isSupabaseConfigured } from '@/lib/supabase/admin'
import { notifyAdminsOfBespokeRequest } from '@/lib/server/adminInboundNotify'
import { formatBespokeStickerPayloadSummary } from '@/lib/agent/bespokeRequestSummary'
import {
  bespokeLogoMetaFromUpload,
  parseBespokeLogoFormEntry,
} from '@/lib/server/parseBespokeLogoUpload'
import {
  BESPOKE_STICKER_FILE_URL_BASE,
  BESPOKE_STICKER_UPLOAD_DIR,
  type BespokeStickerRequestRecord,
  insertBespokeStickerRequest,
  readBespokeStickerRequests,
  uploadBespokeLogoToStorage,
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

  let logoMeta: BespokeStickerRequestRecord['logo'] | undefined = undefined
  let logoStoragePath: string | null = null

  try {
    const parsedLogo = parseBespokeLogoFormEntry(form.get('logoFile'))
    if (parsedLogo.kind === 'file') {
      const fileId = randomUUID()
      const ext = parsedLogo.mimeType === 'image/svg+xml' ? '.svg' : '.png'
      const filename = `${fileId}${ext}`
      const buffer = Buffer.from(await parsedLogo.file.arrayBuffer())

      if (isSupabaseConfigured()) {
        const uploaded = await uploadBespokeLogoToStorage({
          filename,
          buffer,
          mimeType: parsedLogo.mimeType,
        })
        logoStoragePath = uploaded.storagePath
        logoMeta = bespokeLogoMetaFromUpload(parsedLogo, uploaded.fileUrl)
      } else {
        const uploadPath = path.join(BESPOKE_STICKER_UPLOAD_DIR, filename)
        await ensureDir(BESPOKE_STICKER_UPLOAD_DIR)
        await fs.writeFile(uploadPath, buffer)
        logoMeta = bespokeLogoMetaFromUpload(
          parsedLogo,
          `${BESPOKE_STICKER_FILE_URL_BASE}/${filename}`
        )
      }
    }
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        message: err instanceof Error ? err.message : 'Failed to upload logo',
      },
      { status: 500 }
    )
  }

  const requestId = randomUUID()
  const record: BespokeStickerRequestRecord = {
    id: requestId,
    createdAt: new Date().toISOString(),
    status: 'new',
    payload,
    logo: logoMeta,
  }

  try {
    await insertBespokeStickerRequest(record, logoStoragePath)
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        message: err instanceof Error ? err.message : 'Failed to save request',
      },
      { status: 500 }
    )
  }

  const contact = (payload?.contact || {}) as { name?: string; email?: string }
  const roll = (payload?.roll || {}) as { preset?: string; variant?: string }
  const requestSummary = formatBespokeStickerPayloadSummary(payload)

  // Await Resend before responding — same reliability as Contact, and avoids Vercel
  // cutting off fire-and-forget work after logo upload (common Bespoke-only failure).
  let adminNotifyOk = false
  let adminNotifyError: string | undefined
  try {
    const notifyResult = await notifyAdminsOfBespokeRequest({
      id: record.id,
      contactName: contact.name,
      contactEmail: contact.email,
      rollPreset: roll.variant || roll.preset,
      requestSummary,
    })
    adminNotifyOk = notifyResult.ok
    if (!notifyResult.ok) {
      adminNotifyError = notifyResult.logMessage
      console.warn('[bespoke] admin notify failed:', notifyResult.logMessage)
    }
  } catch (err) {
    adminNotifyError = err instanceof Error ? err.message : 'Admin notify failed'
    console.warn('[bespoke] admin notify threw:', adminNotifyError)
  }

  return NextResponse.json({
    success: true,
    id: record.id,
    adminNotifyOk,
    ...(adminNotifyError ? { adminNotifyError } : {}),
  })
}
