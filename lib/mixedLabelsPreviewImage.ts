import { getEffectiveFont } from '@/lib/fontList'
import type { MixedLabelsPreviewSlot } from '@/lib/mixedLabelsTemplates'

const MAX_CANVAS_DIMENSION = 1600

function isSameOriginImageUrl(imageUrl: string): boolean {
  const raw = imageUrl.trim()
  if (!raw || raw.startsWith('data:') || raw.startsWith('blob:')) return true
  if (raw.startsWith('/')) return true
  if (typeof window === 'undefined') return false
  try {
    return new URL(raw, window.location.origin).origin === window.location.origin
  } catch {
    return false
  }
}

function loadImageElement(src: string, crossOrigin: boolean): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    if (crossOrigin) img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = src
  })
}

/** Prefer blob URL so canvas export works for cross-origin product images when CORS allows fetch. */
async function resolveDrawableImageUrl(imageUrl: string): Promise<{ src: string; revoke?: () => void }> {
  const raw = imageUrl.trim()
  if (!raw || raw.startsWith('indexeddb://')) {
    throw new Error('Invalid image URL')
  }
  if (isSameOriginImageUrl(raw)) {
    return { src: raw }
  }

  try {
    const res = await fetch(raw, { mode: 'cors', credentials: 'omit' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const blob = await res.blob()
    const blobUrl = URL.createObjectURL(blob)
    return { src: blobUrl, revoke: () => URL.revokeObjectURL(blobUrl) }
  } catch {
    return { src: raw }
  }
}

export async function generateMixedLabelsPreviewImage(options: {
  imageUrl: string
  name: string
  fontId: string
  slots: MixedLabelsPreviewSlot[]
  textColor?: string
}): Promise<string | null> {
  if (typeof window === 'undefined') return null
  const name = options.name.trim()
  if (!name || !options.imageUrl?.trim()) return null

  const effectiveFont = getEffectiveFont(options.fontId, name)
  const fill = options.textColor || '#000000'

  let revoke: (() => void) | undefined
  try {
    const resolved = await resolveDrawableImageUrl(options.imageUrl)
    revoke = resolved.revoke
    const sameOrigin = isSameOriginImageUrl(resolved.src)
    const img = await loadImageElement(resolved.src, !sameOrigin)

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    let w = img.width
    let h = img.height
    if (w > h && w > MAX_CANVAS_DIMENSION) {
      const s = MAX_CANVAS_DIMENSION / w
      w = MAX_CANVAS_DIMENSION
      h = Math.max(1, Math.round(h * s))
    } else if (h >= w && h > MAX_CANVAS_DIMENSION) {
      const s = MAX_CANVAS_DIMENSION / h
      h = MAX_CANVAS_DIMENSION
      w = Math.max(1, Math.round(w * s))
    }

    canvas.width = w
    canvas.height = h
    ctx.drawImage(img, 0, 0, w, h)

    for (const slot of options.slots) {
      const fontPx = Math.max(10, Math.round((slot.fontSizeRem / 0.65) * (w / 520)))
      ctx.save()
      ctx.font = `bold ${fontPx}px ${effectiveFont.fontFamily}`
      ctx.fillStyle = fill
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const x = (slot.x / 100) * w
      const y = (slot.y / 100) * h
      if (slot.rotateDeg) {
        ctx.translate(x, y)
        ctx.rotate((slot.rotateDeg * Math.PI) / 180)
        ctx.fillText(name, 0, 0)
      } else {
        ctx.fillText(name, x, y)
      }
      ctx.restore()
    }

    return canvas.toDataURL('image/png')
  } catch {
    return null
  } finally {
    revoke?.()
  }
}
