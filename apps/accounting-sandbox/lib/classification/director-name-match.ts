/**
 * Match bank description against the director name from Settings.
 * Works for any company — not tied to a specific person.
 */

export function normaliseDirectorText(value: string): string {
  return value.toUpperCase().replace(/\s+/g, ' ').trim()
}

/**
 * True when description contains the configured director's full name
 * (all significant name parts), or the exact name / reversed name.
 */
export function descriptionMatchesDirector(
  description: string,
  directorName: string | null | undefined
): boolean {
  const name = normaliseDirectorText(directorName || '')
  if (!name || name.length < 3) return false

  const text = normaliseDirectorText(description)
  if (!text) return false

  if (text.includes(name)) return true

  const reversed = name.split(' ').reverse().join(' ')
  if (reversed !== name && text.includes(reversed)) return true

  const parts = name.split(/\s+/).filter((p) => p.length > 2)
  if (parts.length === 0) return false
  return parts.every((part) => text.includes(part))
}

export function loadDirectorNameFromStorage(): string {
  if (typeof window === 'undefined') return ''
  return (localStorage.getItem('director_name') || '').trim()
}
