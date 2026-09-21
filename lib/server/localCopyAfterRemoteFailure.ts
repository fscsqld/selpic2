/**
 * After a configured remote store (Supabase) fails, use a local JSON copy only when it
 * actually has records. Empty Vercel/serverless files are not a source of truth — treating
 * them as [] hides production inbound (bespoke, and the same class of contact/newsletter
 * reads that must not look "empty" after a connect timeout).
 */
export function localCopyAfterRemoteFailure<T>(localRecords: T[]): T[] | null {
  if (!Array.isArray(localRecords) || localRecords.length === 0) return null
  return localRecords
}
