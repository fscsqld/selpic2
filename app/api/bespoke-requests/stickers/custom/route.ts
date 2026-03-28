import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs/promises'
import { randomUUID } from 'crypto'

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

const UPLOAD_DIR = path.join(
  process.cwd(),
  'public',
  'uploads',
  'bespoke-requests',
  'stickers-custom'
)

const FILE_URL_BASE = '/uploads/bespoke-requests/stickers-custom'

async function ensureDir(dirPath: string) {
  await fs.mkdir(dirPath, { recursive: true })
}

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
  await ensureDir(DATA_DIR)
  await fs.writeFile(DATA_FILE, JSON.stringify(records, null, 2), 'utf-8')
}

export async function GET() {
  const records = await readRecords()
  // Newest first
  records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  return NextResponse.json({ records })
}

export async function POST(req: Request) {
  const form = await req.formData()
  const payloadRaw = form.get('payload')
  if (typeof payloadRaw !== 'string' || payloadRaw.trim() === '') {
    return NextResponse.json({ success: false, message: 'Missing payload' }, { status: 400 })
  }

  let payload: any = null
  try {
    payload = JSON.parse(payloadRaw)
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid payload JSON' }, { status: 400 })
  }

  const logo = form.get('logoFile')
  let logoMeta: BespokeStickerRequestRecord['logo'] | undefined = undefined

  // File is optional.
  if (logo) {
    const maybeFile = logo as any
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

    const id = randomUUID()
    const ext = mimeType === 'image/svg+xml' ? '.svg' : '.png'
    const filename = `${id}${ext}`

    const uploadPath = path.join(UPLOAD_DIR, filename)
    await ensureDir(UPLOAD_DIR)

    const arrayBuffer = await maybeFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    await fs.writeFile(uploadPath, buffer)

    logoMeta = {
      fileUrl: `${FILE_URL_BASE}/${filename}`,
      mimeType,
      originalName: typeof maybeFile?.name === 'string' ? maybeFile.name : filename,
      size
    }

    // Store request id separate from logo id: we already created id above for filename uniqueness.
    // But to keep stable id across record, override id later.
  }

  const requestId = randomUUID()
  // If logoMeta was created with a filename id, keep it; request id is record id.
  const record: BespokeStickerRequestRecord = {
    id: requestId,
    createdAt: new Date().toISOString(),
    status: 'new',
    payload,
    logo: logoMeta
  }

  const records = await readRecords()
  records.unshift(record)
  await writeRecords(records)

  return NextResponse.json({ success: true, id: record.id })
}

