import 'server-only'

const BASE = 'https://openapi.etsy.com/v3/application'

const MAX_IMAGES = 10
const FETCH_TIMEOUT_MS = 25_000

async function fetchImageBytes(url: string): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
  const trimmed = url.trim()
  if (trimmed.startsWith('data:')) {
    const m = /^data:([^;,]+);base64,(.+)$/i.exec(trimmed.replace(/\s/g, ''))
    if (!m) throw new Error('Unsupported data URL (expected data:*;base64,...).')
    const contentType = m[1]?.toLowerCase() || 'image/jpeg'
    const buffer = Buffer.from(m[2], 'base64')
    if (buffer.length < 32) throw new Error('Decoded image is too small.')
    const ext =
      contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : contentType.includes('gif') ? 'gif' : 'jpg'
    return { buffer, contentType, filename: `listing.${ext}` }
  }

  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(trimmed, {
      redirect: 'follow',
      signal: ctrl.signal,
      headers: { 'User-Agent': 'SelpicEtsyListing/1.0' },
    })
    if (!res.ok) {
      throw new Error(`Image fetch HTTP ${res.status}`)
    }
    const contentType = (res.headers.get('content-type') || 'image/jpeg').split(';')[0].trim().toLowerCase()
    if (!contentType.startsWith('image/')) {
      throw new Error(`URL is not an image (Content-Type: ${contentType}).`)
    }
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length < 32) throw new Error('Downloaded image is too small.')
    const ext =
      contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : contentType.includes('gif') ? 'gif' : 'jpg'
    const pathPart = (() => {
      try {
        const u = new URL(trimmed)
        const last = u.pathname.split('/').filter(Boolean).pop() || ''
        return last.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 80)
      } catch {
        return ''
      }
    })()
    const filename = pathPart && pathPart.includes('.') ? pathPart : `listing.${ext}`
    return { buffer: buf, contentType, filename }
  } finally {
    clearTimeout(t)
  }
}

/**
 * POST multipart to Etsy `uploadListingImage`.
 * @see https://developer.etsy.com/documentation/reference/#operation/uploadListingImage
 */
export async function uploadListingImageFromUrl(params: {
  shopId: string
  listingId: string
  accessToken: string
  apiKey: string
  imageUrl: string
  rank: number
  altText?: string
}): Promise<Record<string, unknown>> {
  const { buffer, contentType, filename } = await fetchImageBytes(params.imageUrl)
  const file = new File([new Uint8Array(buffer)], filename, { type: contentType })

  const form = new FormData()
  form.append('image', file)
  form.append('rank', String(Math.max(1, Math.floor(params.rank))))
  if (params.altText?.trim()) {
    form.append('alt_text', params.altText.trim().slice(0, 250))
  }

  const path = `/shops/${encodeURIComponent(params.shopId)}/listings/${encodeURIComponent(params.listingId)}/images`
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      'x-api-key': params.apiKey,
    },
    body: form,
    cache: 'no-store',
  })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`Etsy image upload ${res.status}: ${text.slice(0, 400)}`)
  }
  return (text ? JSON.parse(text) : {}) as Record<string, unknown>
}

export async function uploadListingImagesFromUrls(params: {
  shopId: string
  listingId: string
  accessToken: string
  apiKey: string
  imageUrls: string[]
  /** Alt text for rank 1 only when single image; otherwise product name prefix */
  productName: string
}): Promise<{ uploaded: number; errors: string[] }> {
  const urls = [...new Set(params.imageUrls.map((u) => u.trim()).filter(Boolean))].slice(0, MAX_IMAGES)
  const errors: string[] = []
  let uploaded = 0
  let rank = 1
  for (const url of urls) {
    try {
      const alt =
        rank === 1
          ? `${params.productName}`.slice(0, 250)
          : `${params.productName} (${rank})`.slice(0, 250)
      await uploadListingImageFromUrl({
        shopId: params.shopId,
        listingId: params.listingId,
        accessToken: params.accessToken,
        apiKey: params.apiKey,
        imageUrl: url,
        rank,
        altText: alt,
      })
      uploaded++
      rank++
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      errors.push(`${url.slice(0, 120)}: ${msg}`)
    }
  }
  return { uploaded, errors }
}
