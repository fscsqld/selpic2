/**
 * Shared shape for bespoke sticker custom requests (API + admin UI).
 * Keep in sync with JSON stored under data/bespoke-requests/stickers-custom/requests.json
 */

export type BespokeStickerRequestStatus = 'new' | 'reviewed' | 'replied' | 'approved' | 'rejected'

export type BespokeEmailNotification = {
  at: string
  forStatus: 'approved' | 'rejected'
  result: 'sent' | 'skipped' | 'failed'
  detail?: string
}

export type BespokeStickerRequestRecord = {
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
  emailNotification?: BespokeEmailNotification
}
