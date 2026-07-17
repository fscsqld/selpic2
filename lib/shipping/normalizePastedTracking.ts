/**
 * Normalize tracking pasted from MyPost Business / AusPost track pages.
 * Accepts a bare article id or a full track URL.
 */
export function normalizePastedTrackingInput(raw: string): {
  number: string
  providerHint?: 'Australia Post'
} {
  const text = String(raw || '').trim()
  if (!text) return { number: '' }

  const myPostDetails = text.match(/mypost\/track\/?#\/details\/([A-Za-z0-9]+)/i)
  if (myPostDetails?.[1]) {
    return { number: myPostDetails[1], providerHint: 'Australia Post' }
  }

  const trackPath = text.match(/auspost\.com\.au\/(?:track|track\/track\.html)[^\s]*?[?&#](?:id|tracking_?ids?)=([A-Za-z0-9]+)/i)
  if (trackPath?.[1]) {
    return { number: trackPath[1], providerHint: 'Australia Post' }
  }

  const queryId = text.match(/[?&#](?:id|tracking_?id|tracking_?ids?)=([A-Za-z0-9]+)/i)
  if (/auspost\.com\.au/i.test(text) && queryId?.[1]) {
    return { number: queryId[1], providerHint: 'Australia Post' }
  }

  // Bare id / pasted label text: drop spaces and common separators
  const cleaned = text
    .replace(/^https?:\/\/\S+/i, '')
    .replace(/\s+/g, '')
    .replace(/[-–—]/g, '')
    .trim()

  if (!cleaned) return { number: '' }

  // Typical AusPost article ids are alphanumeric; keep as-is after cleanup
  const looksAusPost = /^[A-Z0-9]{8,30}$/i.test(cleaned) || /auspost|mypost/i.test(text)
  return {
    number: cleaned,
    providerHint: looksAusPost ? 'Australia Post' : undefined,
  }
}

export function buildAusPostTrackUrl(trackingNumber: string): string | null {
  const t = String(trackingNumber || '').trim()
  if (!t) return null
  return `https://auspost.com.au/mypost/track/#/details/${encodeURIComponent(t)}`
}
