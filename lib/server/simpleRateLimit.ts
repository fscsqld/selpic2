type Bucket = { count: number; windowStart: number }

const buckets = new Map<string, Bucket>()

/**
 * Fixed-window IP rate limit. Returns true if the request should be allowed.
 */
export function allowRateLimit(bucketKey: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = buckets.get(bucketKey)
  if (!entry) {
    buckets.set(bucketKey, { count: 1, windowStart: now })
    return true
  }
  if (now - entry.windowStart > windowMs) {
    buckets.set(bucketKey, { count: 1, windowStart: now })
    return true
  }
  if (entry.count >= maxRequests) return false
  entry.count += 1
  return true
}
