import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs/promises'

type BespokeStickerRequestStatus = 'new' | 'reviewed' | 'approved' | 'rejected'

type BespokeStickerRequestRecord = {
  id: string
  createdAt: string
  status: BespokeStickerRequestStatus
  payload: any
  logo?: {
    fileUrl: string
    mimeType: string
    originalName: string
    size: number
  }
}

const DATA_DIR = path.join(process.cwd(), 'data', 'bespoke-requests', 'stickers-custom')
const DATA_FILE = path.join(DATA_DIR, 'requests.json')

async function readRecords(): Promise<BespokeStickerRequestRecord[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf-8')
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed
    return []
  } catch {
    return []
  }
}

async function writeRecords(records: BespokeStickerRequestRecord[]) {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(DATA_FILE, JSON.stringify(records, null, 2), 'utf-8')
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: requestId } = await params
  const body = await req.json().catch(() => null)

  const status: any = body?.status
  const allowed: BespokeStickerRequestStatus[] = ['new', 'reviewed', 'approved', 'rejected']
  if (!allowed.includes(status)) {
    return NextResponse.json({ success: false, message: 'Invalid status' }, { status: 400 })
  }

  const records = await readRecords()
  const idx = records.findIndex((r) => r.id === requestId)
  if (idx < 0) {
    return NextResponse.json({ success: false, message: 'Request not found' }, { status: 404 })
  }

  records[idx] = { ...records[idx], status }
  await writeRecords(records)

  return NextResponse.json({ success: true, record: records[idx] })
}

function resolvePublicUploadPath(fileUrl: string): string | null {
  // expected: /uploads/bespoke-requests/stickers-custom/<filename>
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

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: requestId } = await params

  const records = await readRecords()
  const idx = records.findIndex((r) => r.id === requestId)
  if (idx < 0) {
    return NextResponse.json({ success: false, message: 'Request not found' }, { status: 404 })
  }

  const record = records[idx]

  // Remove logo file (optional)
  if (record.logo?.fileUrl) {
    const filePath = resolvePublicUploadPath(record.logo.fileUrl)
    if (filePath) {
      await unlinkIfExists(filePath)
    }
  }

  // Remove record
  records.splice(idx, 1)
  await writeRecords(records)

  return NextResponse.json({ success: true })
}

