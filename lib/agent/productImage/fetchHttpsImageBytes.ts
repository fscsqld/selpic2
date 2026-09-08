/**
 * Download https product source for image edit (provider-agnostic).
 */

export const MAX_SOURCE_IMAGE_BYTES = 15 * 1024 * 1024

export async function fetchHttpsImageBytes(
  imageUrl: string,
  fetchImpl: typeof fetch
): Promise<{ buffer: Buffer; contentType: string; filename: string } | null> {
  if (!/^https:\/\//i.test(imageUrl.trim())) return null
  const res = await fetchImpl(imageUrl.trim(), { redirect: 'follow' })
  if (!res.ok) return null
  const contentType = (res.headers.get('content-type') || 'image/png').split(';')[0].trim()
  if (!contentType.startsWith('image/')) return null
  const ab = await res.arrayBuffer()
  if (ab.byteLength < 32 || ab.byteLength > MAX_SOURCE_IMAGE_BYTES) return null
  const ext =
    contentType.includes('jpeg') || contentType.includes('jpg')
      ? 'jpg'
      : contentType.includes('webp')
        ? 'webp'
        : 'png'
  return {
    buffer: Buffer.from(ab),
    contentType,
    filename: `source.${ext}`,
  }
}
