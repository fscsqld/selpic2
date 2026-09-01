import { describe, expect, it } from 'vitest'
import { parseBespokeLogoFormEntry } from '@/lib/server/parseBespokeLogoUpload'

function mockFile(parts: { name?: string; type?: string; size?: number; bytes?: Uint8Array }): File {
  const bytes = parts.bytes ?? new Uint8Array(parts.size ?? 8)
  const blob = new Blob([bytes], { type: parts.type || '' })
  return new File([blob], parts.name || 'logo.png', { type: parts.type || '' })
}

describe('parseBespokeLogoFormEntry', () => {
  it('treats missing or empty file as none', () => {
    expect(parseBespokeLogoFormEntry(null)).toEqual({ kind: 'none' })
    expect(parseBespokeLogoFormEntry(mockFile({ size: 0, bytes: new Uint8Array() }))).toEqual({ kind: 'none' })
  })

  it('accepts png by extension when mime is empty (Windows)', () => {
    const parsed = parseBespokeLogoFormEntry(mockFile({ name: 'logo.PNG', type: '', size: 12 }))
    expect(parsed.kind).toBe('file')
    if (parsed.kind === 'file') expect(parsed.mimeType).toBe('image/png')
  })

  it('rejects unsupported types', () => {
    expect(() =>
      parseBespokeLogoFormEntry(mockFile({ name: 'photo.jpg', type: 'image/jpeg', size: 12 }))
    ).toThrow(/PNG or SVG/)
  })
})
