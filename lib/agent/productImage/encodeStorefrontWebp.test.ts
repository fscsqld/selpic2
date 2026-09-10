/**
 * encodeStorefrontWebp — product AI + hero budget helper.
 */

import { describe, expect, it } from 'vitest'
import sharp from 'sharp'
import {
  encodeStorefrontWebp,
  STOREFRONT_WEBP_MAX_EDGE,
  STOREFRONT_WEBP_TARGET_BYTES,
  HERO_WEBP_TARGET_BYTES,
} from './encodeStorefrontWebp'

async function solidPng(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 240, g: 120, b: 160 },
    },
  })
    .png()
    .toBuffer()
}

describe('encodeStorefrontWebp', () => {
  it('compresses a large PNG under the product target as WebP', async () => {
    const png = await solidPng(2400, 1800)
    expect(png.length).toBeGreaterThan(50_000)

    const out = await encodeStorefrontWebp(png, { usage: 'product' })
    expect(out.fellBackToOriginal).toBe(false)
    expect(out.compressed).toBe(true)
    expect(out.contentType).toBe('image/webp')
    expect(out.ext).toBe('webp')
    expect(out.bytes).toBeLessThanOrEqual(STOREFRONT_WEBP_TARGET_BYTES)
    expect(out.bytes).toBeLessThan(png.length)
    expect(out.maxEdge).toBeLessThanOrEqual(STOREFRONT_WEBP_MAX_EDGE)

    const meta = await sharp(out.buffer).metadata()
    expect(meta.format).toBe('webp')
    expect(Math.max(meta.width || 0, meta.height || 0)).toBeLessThanOrEqual(
      STOREFRONT_WEBP_MAX_EDGE
    )
  })

  it('uses hero target when usage is hero', async () => {
    const png = await solidPng(2000, 1200)
    const out = await encodeStorefrontWebp(png, { usage: 'hero' })
    expect(out.contentType).toBe('image/webp')
    expect(out.bytes).toBeLessThanOrEqual(HERO_WEBP_TARGET_BYTES)
  })

  it('falls back safely on empty / tiny buffers', async () => {
    const out = await encodeStorefrontWebp(Buffer.from([1, 2, 3]))
    expect(out.fellBackToOriginal).toBe(true)
    expect(out.compressed).toBe(false)
    expect(out.bytes).toBe(3)
  })
})
