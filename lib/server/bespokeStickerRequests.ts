import path from 'path'
import fs from 'fs/promises'

export type BespokeStickerRequestStatus = 'new' | 'reviewed' | 'approved' | 'rejected'

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

export async function ensureBespokeDataDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true })
}

export async function readBespokeStickerRequests(): Promise<BespokeStickerRequestRecord[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf-8')
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as BespokeStickerRequestRecord[]
  } catch {
    return []
  }
}

export async function writeBespokeStickerRequests(records: BespokeStickerRequestRecord[]): Promise<void> {
  await ensureBespokeDataDir()
  await fs.writeFile(DATA_FILE, JSON.stringify(records, null, 2), 'utf-8')
}

export function countBespokeStickerRequestsByStatus(
  records: BespokeStickerRequestRecord[],
  status: BespokeStickerRequestStatus
): number {
  return records.filter((r) => r.status === status).length
}
