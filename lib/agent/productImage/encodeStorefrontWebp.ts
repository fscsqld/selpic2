/**
 * Post-b64 encode for OpenAI / Google Nano Banana product images (and reusable for CMS).
 * Invariant: Media Library URL should be web-ready WebP so admins need not Squoosh again.
 * See `.cursor/rules/storefront-cms-media-budgets.mdc`.
 */

import sharp from 'sharp'

/** Product AI / PDP long-edge cap. */
export const STOREFRONT_WEBP_MAX_EDGE = 1600
/** Prefer landing under this after quality steps. */
export const STOREFRONT_WEBP_TARGET_BYTES = 500 * 1024
/** Soft ceiling — if still over, shrink edge further. */
export const STOREFRONT_WEBP_SOFT_MAX_BYTES = 800 * 1024
/** Hero image / video fallback budget (same helper, stricter target). */
export const HERO_WEBP_TARGET_BYTES = 500 * 1024

const QUALITY_STEPS = [80, 72, 64, 56, 48] as const

export type StorefrontWebpUsage = 'product' | 'hero'

export type EncodeStorefrontWebpResult = {
  buffer: Buffer
  contentType: 'image/webp' | 'image/png' | 'image/jpeg'
  ext: 'webp' | 'png' | 'jpg'
  bytes: number
  compressed: boolean
  quality: number | null
  maxEdge: number
  /** True when sharp failed and original bytes were kept. */
  fellBackToOriginal: boolean
}

function targetForUsage(usage: StorefrontWebpUsage): number {
  return usage === 'hero' ? HERO_WEBP_TARGET_BYTES : STOREFRONT_WEBP_TARGET_BYTES
}

/**
 * Resize + WebP-encode AI or upload bytes for storefront delivery.
 * On sharp failure, returns the original buffer as png/jpeg guess (does not throw).
 */
export async function encodeStorefrontWebp(
  input: Buffer,
  opts?: {
    usage?: StorefrontWebpUsage
    maxEdge?: number
    targetBytes?: number
  }
): Promise<EncodeStorefrontWebpResult> {
  const usage = opts?.usage ?? 'product'
  const maxEdge = opts?.maxEdge ?? STOREFRONT_WEBP_MAX_EDGE
  const targetBytes = opts?.targetBytes ?? targetForUsage(usage)

  if (!input?.length || input.length < 32) {
    return {
      buffer: input ?? Buffer.alloc(0),
      contentType: 'image/png',
      ext: 'png',
      bytes: input?.length ?? 0,
      compressed: false,
      quality: null,
      maxEdge,
      fellBackToOriginal: true,
    }
  }

  try {
    let edge = maxEdge
    let best: { buffer: Buffer; quality: number } | null = null

    for (let pass = 0; pass < 2; pass++) {
      for (const quality of QUALITY_STEPS) {
        const out = await sharp(input, { failOn: 'none' })
          .rotate()
          .resize({
            width: edge,
            height: edge,
            fit: 'inside',
            withoutEnlargement: true,
          })
          .webp({ quality, effort: 4 })
          .toBuffer()

        if (!best || out.length < best.buffer.length) {
          best = { buffer: out, quality }
        }
        if (out.length <= targetBytes) {
          return {
            buffer: out,
            contentType: 'image/webp',
            ext: 'webp',
            bytes: out.length,
            compressed: true,
            quality,
            maxEdge: edge,
            fellBackToOriginal: false,
          }
        }
      }
      // Still over target — second pass at smaller edge
      edge = Math.max(960, Math.round(edge * 0.75))
    }

    if (best && best.buffer.length <= STOREFRONT_WEBP_SOFT_MAX_BYTES) {
      return {
        buffer: best.buffer,
        contentType: 'image/webp',
        ext: 'webp',
        bytes: best.buffer.length,
        compressed: true,
        quality: best.quality,
        maxEdge: edge,
        fellBackToOriginal: false,
      }
    }

    // Prefer WebP even if soft-max missed — usually still << raw PNG
    if (best && best.buffer.length < input.length) {
      return {
        buffer: best.buffer,
        contentType: 'image/webp',
        ext: 'webp',
        bytes: best.buffer.length,
        compressed: true,
        quality: best.quality,
        maxEdge: edge,
        fellBackToOriginal: false,
      }
    }

    return fallbackOriginal(input, maxEdge)
  } catch {
    return fallbackOriginal(input, maxEdge)
  }
}

function fallbackOriginal(input: Buffer, maxEdge: number): EncodeStorefrontWebpResult {
  const head = input.subarray(0, 12)
  const isJpeg = head[0] === 0xff && head[1] === 0xd8
  const isWebp =
    head.length >= 12 &&
    head[0] === 0x52 &&
    head[1] === 0x49 &&
    head[2] === 0x46 &&
    head[3] === 0x46 &&
    head[8] === 0x57 &&
    head[9] === 0x45 &&
    head[10] === 0x42 &&
    head[11] === 0x50

  if (isWebp) {
    return {
      buffer: input,
      contentType: 'image/webp',
      ext: 'webp',
      bytes: input.length,
      compressed: false,
      quality: null,
      maxEdge,
      fellBackToOriginal: true,
    }
  }
  if (isJpeg) {
    return {
      buffer: input,
      contentType: 'image/jpeg',
      ext: 'jpg',
      bytes: input.length,
      compressed: false,
      quality: null,
      maxEdge,
      fellBackToOriginal: true,
    }
  }
  return {
    buffer: input,
    contentType: 'image/png',
    ext: 'png',
    bytes: input.length,
    compressed: false,
    quality: null,
    maxEdge,
    fellBackToOriginal: true,
  }
}
