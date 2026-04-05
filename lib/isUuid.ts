/** True if `id` looks like a Supabase Auth user id (UUID v4-style). */
export function isUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    (id || '').trim()
  )
}
