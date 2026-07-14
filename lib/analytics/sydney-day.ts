/** Calendar date in Australia/Sydney as YYYY-MM-DD. */
export function toSydneyDay(input: Date | string | number = new Date()): string {
  const date = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Sydney',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

/** Inclusive list of Sydney days from `fromDay` to `toDay` (YYYY-MM-DD). */
export function listSydneyDaysInclusive(fromDay: string, toDay: string): string[] {
  if (!fromDay || !toDay || fromDay > toDay) return []
  const days: string[] = []
  // Walk noon UTC anchors so DST does not skip a calendar day when adding 24h.
  let cursor = new Date(`${fromDay}T12:00:00.000Z`)
  const end = new Date(`${toDay}T12:00:00.000Z`)
  while (cursor.getTime() <= end.getTime()) {
    const d = toSydneyDay(cursor)
    if (d) days.push(d)
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000)
  }
  return days
}
