/** Best-effort author match for storefront users (same trust model as pre-Supabase client checks). */

export type ActorPayload = {
  actorUserId?: string | null
  actorEmail?: string | null
  actorName?: string | null
}

export function canMutateAsPostAuthor(
  row: { author_display: string; author_user_id: string | null },
  actor: ActorPayload
): boolean {
  const uid = actor.actorUserId?.trim()
  if (uid && row.author_user_id && row.author_user_id === uid) return true
  const email = actor.actorEmail?.trim()
  const name = actor.actorName?.trim()
  if (!row.author_user_id || row.author_user_id === '') {
    if (email && row.author_display === email) return true
    if (name && row.author_display === name) return true
  }
  return false
}

export function canMutateAsCommentAuthor(
  row: { author_display: string; author_user_id: string | null },
  actor: ActorPayload
): boolean {
  return canMutateAsPostAuthor(row, actor)
}
