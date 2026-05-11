/** Map Supabase rows to the Community UI shape (client-local types). */

export type CommunityCategoryClient = {
  id: string
  name: string
  emoji: string
  bgColor: string
  textColor: string
  borderColor: string
  order: number
  isActive: boolean
  isDefault?: boolean
}

export type CommentClient = {
  id: number
  postId: number
  author: string
  content: string
  date: string
}

export type PostClient = {
  id: number
  title: string
  author: string
  date: string
  content: string
  likes: number
  comments: number
  category: string
  pinned?: boolean
  hidden?: boolean
  reported?: boolean
  postComments?: CommentClient[]
}

type CategoryRow = {
  slug: string
  name: string
  emoji: string | null
  bg_color: string | null
  text_color: string | null
  border_color: string | null
  sort_order: number | null
  is_active: boolean | null
  is_default: boolean | null
}

export function categoryRowToClient(row: CategoryRow): CommunityCategoryClient {
  return {
    id: row.slug,
    name: row.name,
    emoji: row.emoji ?? '💬',
    bgColor: row.bg_color ?? 'bg-blue-100',
    textColor: row.text_color ?? 'text-blue-800',
    borderColor: row.border_color ?? 'border-blue-300',
    order: row.sort_order ?? 0,
    isActive: row.is_active ?? true,
    isDefault: row.is_default ? true : undefined,
  }
}

type PostRow = {
  id: number
  title: string
  content: string
  author_display: string
  category: string
  likes: number | null
  pinned: boolean | null
  hidden: boolean | null
  reported: boolean | null
  created_at: string
}

type CommentRow = {
  id: number
  post_id: number
  author_display: string
  content: string
  created_at: string
}

export function buildPostsWithComments(
  postRows: PostRow[],
  commentRows: CommentRow[],
  options: { includeModeration?: boolean } = {}
): PostClient[] {
  const byPost = new Map<number, CommentClient[]>()
  for (const c of commentRows) {
    const list = byPost.get(c.post_id) ?? []
    list.push({
      id: c.id,
      postId: c.post_id,
      author: c.author_display,
      content: c.content,
      date: c.created_at.split('T')[0],
    })
    byPost.set(c.post_id, list)
  }

  return postRows.map((p) => {
    const pcs = byPost.get(p.id) ?? []
    const base: PostClient = {
      id: p.id,
      title: p.title,
      author: p.author_display,
      date: p.created_at.split('T')[0],
      content: p.content,
      likes: p.likes ?? 0,
      comments: pcs.length,
      category: p.category,
      postComments: pcs,
      pinned: !!p.pinned,
    }
    if (options.includeModeration) {
      base.hidden = !!p.hidden
      base.reported = !!p.reported
    }
    return base
  })
}
