import type { BespokeStickerRequestRecord } from '@/lib/server/bespokeStickerRequests'

export type ParsedBespokeLogoUpload =
  | { kind: 'none' }
  | {
      kind: 'file'
      file: File
      mimeType: 'image/png' | 'image/svg+xml'
      size: number
      originalName: string
    }

function isFileLike(value: FormDataEntryValue | null): value is File {
  return Boolean(value && typeof value === 'object' && typeof (value as File).arrayBuffer === 'function')
}

/** Skip empty multipart parts — some browsers send a 0-byte logoFile entry. */
export function parseBespokeLogoFormEntry(logo: FormDataEntryValue | null): ParsedBespokeLogoUpload {
  if (!isFileLike(logo)) return { kind: 'none' }

  const size = typeof logo.size === 'number' ? logo.size : 0
  if (size <= 0) return { kind: 'none' }

  const name = typeof logo.name === 'string' ? logo.name.trim() : ''
  const rawType = (logo.type || '').trim().toLowerCase()

  let mimeType: 'image/png' | 'image/svg+xml' | null = null
  if (rawType === 'image/png' || rawType === 'image/x-png') mimeType = 'image/png'
  else if (rawType === 'image/svg+xml') mimeType = 'image/svg+xml'
  else if (name.toLowerCase().endsWith('.png')) mimeType = 'image/png'
  else if (name.toLowerCase().endsWith('.svg')) mimeType = 'image/svg+xml'

  if (!mimeType) {
    throw new Error('Only PNG or SVG logo files are allowed.')
  }

  const maxBytes = 10 * 1024 * 1024
  if (size > maxBytes) {
    throw new Error('File is too large. Max size is 10MB.')
  }

  return {
    kind: 'file',
    file: logo,
    mimeType,
    size,
    originalName: name || 'logo',
  }
}

export function bespokeLogoMetaFromUpload(
  parsed: Extract<ParsedBespokeLogoUpload, { kind: 'file' }>,
  fileUrl: string
): NonNullable<BespokeStickerRequestRecord['logo']> {
  return {
    fileUrl,
    mimeType: parsed.mimeType,
    originalName: parsed.originalName,
    size: parsed.size,
  }
}
