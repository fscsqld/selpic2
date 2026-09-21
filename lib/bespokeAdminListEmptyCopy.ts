/** Admin list empty copy: never treat a load error as “no rows”. */
export function bespokeAdminListEmptyCopy(opts: {
  loading: boolean
  error: string | null
  search: string
  count: number
}): string | null {
  if (opts.loading || opts.error || opts.count > 0) return null
  return opts.search.trim() ? 'No matching requests.' : 'No requests found.'
}
